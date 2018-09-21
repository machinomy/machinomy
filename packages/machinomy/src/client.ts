import { EventEmitter } from 'events'
import { PaymentRequired, STATUS_CODES, Transport } from './transport'
import Payment from './payment'
import IChannelManager from './IChannelManager'
import * as request from 'request'
import Logger from '@machinomy/logger'
import fetcher from './util/fetcher'
import { AcceptPaymentRequest, AcceptPaymentRequestSerde } from './accept_payment_request'
import { AcceptPaymentResponse, AcceptPaymentResponseSerde } from './accept_payment_response'
import { AcceptTokenRequest, AcceptTokenRequestSerde } from './accept_token_request'
import { AcceptTokenResponse, AcceptTokenResponseSerde } from './accept_token_response'

const LOG = new Logger('client')

export default interface Client extends EventEmitter {
  doPreflight (uri: string): Promise<PaymentRequired>
  doPayment (payment: Payment, gateway: string, purchaseMeta?: any): Promise<AcceptPaymentResponse>
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

  private channelManager: IChannelManager

  constructor (transport: Transport, channelManager: IChannelManager) {
    super()
    this.transport = transport
    this.channelManager = channelManager
  }

  doPreflight (uri: string): Promise<PaymentRequired> {
    this.emit('willPreflight')

    return this.transport.get(uri).then((res: request.RequestResponse) => {
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

  async doPayment (payment: Payment, gateway: string, purchaseMeta?: any): Promise<AcceptPaymentResponse> {
    this.emit('willSendPayment')

    LOG.info(`Attempting to send payment to ${gateway}. Sender: ${payment.sender} / Receiver: ${payment.receiver} / Amount: ${payment.price.toString()}`)

    const request = new AcceptPaymentRequest(payment, purchaseMeta)

    const deres = this.transport.doPayment(request, gateway)
    LOG.info(`Successfully sent payment to ${gateway}.`)
    this.emit('didSendPayment')
    return deres
  }

  async acceptPayment (req: AcceptPaymentRequest): Promise<AcceptPaymentResponse> {
    const payment = req.payment

    LOG.info(`Received payment request. Sender: ${payment.sender} / Receiver: ${payment.receiver}`)
    let token = await this.channelManager.acceptPayment(payment)
    LOG.info(`Accepted payment request. Sender: ${payment.sender} / Receiver: ${payment.receiver}`)
    return new AcceptPaymentResponse(token)
  }

  async doVerify (token: string, gateway: string): Promise<AcceptTokenResponse> {
    this.emit('willVerifyToken')

    LOG.info(`Attempting to verify token with ${gateway}.`)

    const request = new AcceptTokenRequest(token)

    try {
      const deres = this.transport.doVerify(request, gateway)
      LOG.info(`Successfully verified token with ${gateway}.`)
      this.emit('didVerifyToken')
      return deres
    } catch (e) {
      return new AcceptTokenResponse(false)
    }
  }

  acceptVerify (req: AcceptTokenRequest): Promise<AcceptTokenResponse> {
    return this.channelManager.verifyToken(req.token)
      .then((res: boolean) => new AcceptTokenResponse(res))
      .catch(() => new AcceptTokenResponse(false))
  }

  private handlePaymentRequired (res: request.RequestResponse): PaymentRequired {
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
