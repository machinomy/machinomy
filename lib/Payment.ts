import Web3 = require('web3')
import Promise = require('bluebird')
import { PaymentChannel } from './channel'

export interface PaymentJSON {
  channelId: string
  sender: string
  receiver: string
  price: number
  value: number
  channelValue: number
  v: number|string
  r: string
  s: string
}

export default class Payment {
  channelId: string
  sender: string
  receiver: string
  price: number
  value: number
  channelValue: number
  v: number
  r: string
  s: string

  constructor (options: PaymentJSON) {
    this.channelId = options.channelId
    this.sender = options.sender
    this.receiver = options.receiver
    this.price = options.price
    this.value = options.value
    this.channelValue = options.channelValue
    this.v = Number(options.v)
    this.r = options.r
    this.s = options.s
  }

  /**
   * Build {Payment} based on PaymentChannel and monetary value to send.
   */
  static fromPaymentChannel (web3: Web3, paymentChannel: PaymentChannel, price: number, override?: boolean): Promise<Payment> {
    let value = price + paymentChannel.spent
    if (override) { // FIXME
      value = paymentChannel.spent
    }
    return paymentChannel.sign(web3, value).then((signature) => {
      return new Payment({
        channelId: paymentChannel.channelId,
        sender: paymentChannel.sender,
        receiver: paymentChannel.receiver,
        price,
        value,
        channelValue: paymentChannel.value,
        v: signature.v,
        r: '0x' + signature.r.toString('hex'),
        s: '0x' + signature.s.toString('hex')
      })
    })
  }
}
