import * as Request from 'request-promise-native'
import { EventEmitter } from 'events'
import { PaymentRequired, STATUS_CODES } from './transport'
import Payment, { PaymentSerde } from './Payment'
import { Transport } from './transport'
import ChannelManager from './channel_manager'
import Serde from './serde'
import serviceRegistry from './container'
import { RequestResponse } from 'request'
import log from './util/log'

const LOG = log('Client')

export class AcceptPaymentRequest {
  payment: Payment

  constructor (payment: Payment) {
    this.payment = payment
  }
}

export class AcceptPaymentRequestSerde implements Serde<AcceptPaymentRequest> {
  static instance: AcceptPaymentRequestSerde = new AcceptPaymentRequestSerde()

  serialize (obj: AcceptPaymentRequest): object {
    return {
      payment: PaymentSerde.instance.serialize(obj.payment)
    }
  }

  deserialize (data: any): AcceptPaymentRequest {
    if (!data.payment) {
      throw new Error('Cannot deserialize payment request. Payment is missing.')
    }

    const payment = PaymentSerde.instance.deserialize(data.payment)
    return new AcceptPaymentRequest(payment)
  }
}

export class AcceptPaymentResponse {
  token: string

  constructor (token: string) {
    this.token = token
  }
}

export class AcceptPaymentResponseSerde implements Serde<AcceptPaymentResponse> {
  static instance: AcceptPaymentResponseSerde = new AcceptPaymentResponseSerde()

  serialize (obj: AcceptPaymentResponse): object {
    return {
      token: obj.token
    }
  }

  deserialize (data: any): AcceptPaymentResponse {
    if (!data.token) {
      throw new Error('Cannot deserialize payment response. Token is missing.')
    }

    return new AcceptPaymentResponse(data.token)
  }
}

export class AcceptTokenRequest {
  token: string

  constructor (token: string) {
    this.token = token
  }
}

export class AcceptTokenRequestSerde implements Serde<AcceptTokenRequest> {
  static instance: AcceptTokenRequestSerde = new AcceptTokenRequestSerde()

  serialize (obj: AcceptTokenRequest): object {
    return {
      token: obj.token
    }
  }

  deserialize (data: any): AcceptTokenRequest {
    if (!data.token) {
      throw new Error('Cannot deserialize token request. Token is missing.')
    }

    return new AcceptTokenRequest(data.token)
  }
}

export class AcceptTokenResponse {
  status: boolean

  constructor (status: boolean) {
    this.status = status
  }
}

export class AcceptTokenResponseSerde implements Serde<AcceptTokenResponse> {
  static instance: AcceptTokenResponseSerde = new AcceptTokenResponseSerde()

  serialize (obj: AcceptTokenResponse): object {
    return {
      status: obj.status
    }
  }

  deserialize (data: any): AcceptTokenResponse {
    if (data.status === undefined) {
      throw new Error('Cannot deserialize token response. Status is missing.')
    }

    return new AcceptTokenResponse(data.status)
  }
}

export default interface Client {
  doPreflight (uri: string): Promise<PaymentRequired>
  doPayment (payment: Payment, gateway: string): Promise<AcceptPaymentResponse>
  acceptPayment (req: AcceptPaymentRequest): Promise<AcceptPaymentResponse>
  doVerify (token: string, gateway: string): Promise<AcceptTokenResponse>
  acceptVerify (req: AcceptTokenRequest): Promise<AcceptTokenResponse>
}

export class ClientImpl extends EventEmitter implements Client {
  private static HEADER_PREFIX = 'paywall'

  private static REQUIRED_HEADERS = [
    'version',
    'address',
    'price',
    'gateway'
  ]

  private transport: Transport

  private channelManager: ChannelManager

  constructor (transport: Transport, channelManager: ChannelManager) {
    super()
    this.transport = transport
    this.channelManager = channelManager
  }

  doPreflight (uri: string): Promise<PaymentRequired> {
    this.emit('willPreflight')

    return this.transport.get(uri).then((res: RequestResponse) => {
      this.emit('didPreflight')

      switch (res.statusCode) {
        case STATUS_CODES.PAYMENT_REQUIRED:
        case STATUS_CODES.OK:
          return this.handlePaymentRequired(res)
        default:
          throw new Error('Received bad response from content server.')
      }
    })
  }

  doPayment (payment: Payment, gateway: string): Promise<AcceptPaymentResponse> {
    this.emit('willSendPayment')

    LOG(`Attempting to send payment to ${gateway}.`)

    const request = new AcceptPaymentRequest(payment)

    return Request.post(gateway, {
      json: true,
      body: AcceptPaymentRequestSerde.instance.serialize(request)
    }).then((res: any) => {
      const deres = AcceptPaymentResponseSerde.instance.deserialize(res)
      LOG(`Successfully sent payment to ${gateway}.`)
      this.emit('didSendPayment')
      return deres
    })
  }

  acceptPayment (req: AcceptPaymentRequest): Promise<AcceptPaymentResponse> {
    const payment = req.payment

    LOG(`Received payment request. Sender: ${payment.sender} / Receiver: ${payment.receiver}`)

    return this.channelManager.acceptPayment(payment)
      .then((token: string) => {
        LOG(`Accepted payment request. Sender: ${payment.sender} / Receiver: ${payment.receiver}`)
        return new AcceptPaymentResponse(token)
      })
  }

  doVerify (token: string, gateway: string): Promise<AcceptTokenResponse> {
    this.emit('willVerifyToken')

    LOG(`Attempting to verify token with ${gateway}.`)

    const request = new AcceptTokenRequest(token)

    return Request.post(gateway, {
      json: true,
      body: AcceptTokenRequestSerde.instance.serialize(request)
    }).then((res: any) => {
      const deres = AcceptTokenResponseSerde.instance.deserialize(res)
      LOG(`Successfully verified token with ${gateway}.`)
      this.emit('didVerifyToken')
      return deres
    }).catch(() => new AcceptTokenResponse(false))
  }

  acceptVerify (req: AcceptTokenRequest): Promise<AcceptTokenResponse> {
    return this.channelManager.verifyToken(req.token)
      .then(() => new AcceptTokenResponse(true))
      .catch(() => new AcceptTokenResponse(false))
  }

  private handlePaymentRequired (res: RequestResponse): PaymentRequired {
    const headers = res.headers

    ClientImpl.REQUIRED_HEADERS.forEach((name: string) => {
      const header = `${ClientImpl.HEADER_PREFIX}-${name}`
      if (!headers[header]) {
        throw new Error(`Missing required header: ${header}`)
      }
    })

    return PaymentRequired.parse(headers)
  }
}

serviceRegistry.bind('Client', (transport: Transport, channelManager: ChannelManager) => {
  return new ClientImpl(transport, channelManager)
}, ['Transport', 'ChannelManager'])
