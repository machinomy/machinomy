import { EventEmitter } from 'events'
import { Transport } from './transport'
import Payment from './payment'
import IChannelManager from './IChannelManager'
import Logger from '@machinomy/logger'
import { AcceptPaymentRequest } from './accept_payment_request'
import { AcceptPaymentResponse } from './accept_payment_response'
import { AcceptTokenRequest } from './accept_token_request'
import { AcceptTokenResponse } from './accept_token_response'
import { PaymentRequiredRequest } from './PaymentRequiredRequest'
import { PaymentRequiredResponse } from './PaymentRequiredResponse'

const LOG = new Logger('client')

export default interface Client extends EventEmitter {
  doPreflight (gateway: string, datetime?: number): Promise<PaymentRequiredResponse>
  doPayment (payment: Payment, gateway: string, purchaseMeta?: any): Promise<AcceptPaymentResponse>
  acceptPayment (req: AcceptPaymentRequest): Promise<AcceptPaymentResponse>
  doVerify (token: string, gateway: string): Promise<AcceptTokenResponse>
  acceptVerify (req: AcceptTokenRequest): Promise<AcceptTokenResponse>
}

export class ClientImpl extends EventEmitter implements Client {

  private transport: Transport

  private channelManager: IChannelManager

  constructor (transport: Transport, channelManager: IChannelManager) {
    super()
    this.transport = transport
    this.channelManager = channelManager
  }

  async doPreflight (gateway: string, datetime?: number): Promise<PaymentRequiredResponse> {
    this.emit('willPreflight')

    const request = new PaymentRequiredRequest(datetime)

    const deres = await this.transport.paymentRequired(request, gateway)
    this.emit('didPreflight')
    return deres
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
}
