import Web3 = require('web3')
import * as util from 'ethereumjs-util'
import { PaymentChannel, Signature } from './channel'
import { buildBrokerContract, buildBrokerTokenContract, sign, soliditySHA3 } from 'machinomy-contracts'

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
  contractAddress?: string
}

export function getNetwork (web3: Web3): Promise<string> {
  return new Promise((resolve, reject) => {
    web3.version.getNetwork((error, result) => {
      if (error) {
        reject(error)
      }
      resolve(result)
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
  v: number
  r: string
  s: string
  contractAddress: string | undefined

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
    this.contractAddress = options.contractAddress
  }

  // TODO use it
  static async isValid (web3: Web3, payment: Payment, paymentChannel: PaymentChannel): Promise<boolean> {
    let validIncrement = (paymentChannel.spent + payment.price) <= paymentChannel.value
    let validChannelValue = paymentChannel.value === payment.channelValue
    let validChannelId = paymentChannel.channelId === payment.channelId
    let validPaymentValue = paymentChannel.value <= payment.channelValue
    let validSender = paymentChannel.sender === payment.sender
    let isPositive = payment.value >= 0 && payment.price >= 0
    let deployed
    if (paymentChannel.contractAddress) {
      deployed = await buildBrokerTokenContract(web3).deployed()
    } else {
      deployed = await buildBrokerContract(web3).deployed()
    }
    let chainId = await getNetwork(web3)
    let paymentDigest = soliditySHA3(paymentChannel.channelId, payment.value, deployed.address, chainId)

    let signature = await sign(web3, paymentChannel.sender, paymentDigest)
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
  }

  /**
   * Build {Payment} based on PaymentChannel and monetary value to send.
   */
  static async fromPaymentChannel (web3: Web3, paymentChannel: PaymentChannel, price: number, override?: boolean): Promise<Payment> {
    let value = price + paymentChannel.spent
    if (override) { // FIXME
      value = price
    }
    let deployed
    if (paymentChannel.contractAddress) {
      deployed = await buildBrokerTokenContract(web3).deployed()
    } else {
      deployed = await buildBrokerContract(web3).deployed()
    }
    let chainId = await getNetwork(web3)
    let paymentDigest = soliditySHA3(paymentChannel.channelId, value, deployed.address, chainId)

    let signature = await sign(web3, paymentChannel.sender, paymentDigest)
    return new Payment({
      channelId: paymentChannel.channelId,
      sender: paymentChannel.sender,
      receiver: paymentChannel.receiver,
      price,
      value,
      channelValue: paymentChannel.value,
      v: signature.v,
      r: '0x' + signature.r.toString('hex'),
      s: '0x' + signature.s.toString('hex'),
      contractAddress: paymentChannel.contractAddress
    })
  }
}
