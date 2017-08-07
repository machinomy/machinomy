import Web3 = require('web3')
import Promise = require('bluebird')
import * as util from 'ethereumjs-util'
import { ChannelId, ethHash, PaymentChannel, Signature } from './channel'
import { Buffer } from 'buffer'

const EXTRA_DIGITS = 3
export function randomNonce (): number {
  const datePart = new Date().getTime() * Math.pow(10, EXTRA_DIGITS)
  // 3 random digits
  const extraPart = Math.floor(Math.random() * Math.pow(10, EXTRA_DIGITS))
  // 16 digits
  return datePart + extraPart
}

export interface PaymentJSON {
  channelId: string
  sender: string
  receiver: string
  price: number
  value: number
  channelValue: number
  nonce: number
  v: number|string
  r: string
  s: string
}

export function digest (channelId: string|ChannelId, value: number): Buffer {
  const message = channelId.toString() + value.toString()
  return Buffer.from(message)
}

export function sign (web3: Web3, sender: string, digest: Buffer): Promise<Signature> {
  return new Promise<Signature>((resolve, reject) => {
    const message = digest.toString()
    const sha3 = ethHash(message)
    web3.eth.sign(sender, sha3, (error, signature) => {
      if (error) {
        reject(error)
      } else {
        resolve(util.fromRpcSig(signature))
      }
    })
  })
}

export default class Payment {
  channelId: string
  sender: string
  receiver: string
  price: number
  value: number
  channelValue: number
  nonce: number
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
    this.nonce = options.nonce
    this.v = Number(options.v)
    this.r = options.r
    this.s = options.s
  }

  static isValid (web3: Web3, payment: Payment, paymentChannel: PaymentChannel): Promise<boolean> {
    let validIncrement = (paymentChannel.spent + payment.price) <= paymentChannel.value
    let validChannelValue = paymentChannel.value === payment.channelValue
    let validChannelId = paymentChannel.channelId === payment.channelId
    let validPaymentValue = paymentChannel.value <= payment.channelValue
    let validSender = paymentChannel.sender === payment.sender
    let isPositive = payment.value >= 0 && payment.price >= 0
    let _digest = digest(paymentChannel.channelId, payment.value)
    return sign(web3, payment.sender, _digest).then(signature => {
      let validSignature = signature.v === payment.v &&
        util.bufferToHex(signature.r) === payment.r &&
        util.bufferToHex(signature.s) === payment.s
      return validIncrement &&
        validChannelValue &&
        validPaymentValue &&
        validSender &&
        validChannelId &&
        validSignature &&
        isPositive
    })
  }

  /**
   * Build {Payment} based on PaymentChannel and monetary value to send.
   */
  static fromPaymentChannel (web3: Web3, paymentChannel: PaymentChannel, price: number, override?: boolean): Promise<Payment> {
    let value = price + paymentChannel.spent
    if (override) { // FIXME
      value = paymentChannel.spent
    }
    let paymentDigest = digest(paymentChannel.channelId, value)
    return sign(web3, paymentChannel.sender, paymentDigest).then(signature => {
      let nonce = (paymentChannel.nonce || randomNonce()) + 1
      return new Payment({
        channelId: paymentChannel.channelId,
        sender: paymentChannel.sender,
        receiver: paymentChannel.receiver,
        price,
        value,
        channelValue: paymentChannel.value,
        nonce: nonce,
        v: signature.v,
        r: '0x' + signature.r.toString('hex'),
        s: '0x' + signature.s.toString('hex')
      })
    })
  }
}
