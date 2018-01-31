import Web3 = require('web3')
import * as util from 'ethereumjs-util'
import { PaymentChannel } from './channel'
import { PaymentRequired } from './transport'
import { Broker, TokenBroker, sign, paymentDigest } from '@machinomy/contracts'
import * as BigNumber from 'bignumber.js'
import Serde from './serde'

export interface PaymentJSON {
  channelId: string
  sender: string
  receiver: string
  price: BigNumber.BigNumber
  value: BigNumber.BigNumber
  channelValue: BigNumber.BigNumber
  v: number|string
  r: string
  s: string
  meta: string
  contractAddress?: string
  token: string | undefined
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
  price: BigNumber.BigNumber
  value: BigNumber.BigNumber
  channelValue: BigNumber.BigNumber
  v: number
  r: string
  s: string
  meta: string
  contractAddress: string | undefined
  token: string | undefined

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
    this.meta = options.meta
    this.contractAddress = options.contractAddress
    this.token = options.token
  }

  // TODO use it
  static async isValid (web3: Web3, payment: Payment, paymentChannel: PaymentChannel): Promise<boolean> {
    let validIncrement = (paymentChannel.spent.plus(payment.price)).lessThanOrEqualTo(paymentChannel.value)
    let validChannelValue = paymentChannel.value.equals(payment.channelValue)
    let validChannelId = paymentChannel.channelId === payment.channelId
    let validPaymentValue = paymentChannel.value.lessThanOrEqualTo(payment.channelValue)
    let validSender = paymentChannel.sender === payment.sender
    let isPositive = payment.value.greaterThanOrEqualTo(new BigNumber.BigNumber(0)) && payment.price.greaterThanOrEqualTo(new BigNumber.BigNumber(0))
    let deployed
    if (paymentChannel.contractAddress) {
      deployed = await TokenBroker.deployed(web3.currentProvider)
    } else {
      deployed = await Broker.deployed(web3.currentProvider)
    }
    let chainId = await getNetwork(web3)
    let _paymentDigest = paymentDigest(paymentChannel.channelId, payment.value, deployed.address, Number(chainId))

    let signature = await sign(web3, paymentChannel.sender, _paymentDigest)
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
  static async fromPaymentChannel (web3: Web3, paymentChannel: PaymentChannel, paymentRequired: PaymentRequired, override?: boolean): Promise<Payment> {
    let value = paymentRequired.price.plus(paymentChannel.spent)
    if (override) { // FIXME
      value = paymentRequired.price
    }
    let deployed
    if (paymentChannel.contractAddress) {
      deployed = await TokenBroker.deployed(web3.currentProvider)
    } else {
      deployed = await Broker.deployed(web3.currentProvider)
    }
    let chainId = await getNetwork(web3)
    let _paymentDigest = paymentDigest(paymentChannel.channelId, value, deployed.address, Number(chainId))

    let signature = await sign(web3, paymentChannel.sender, _paymentDigest)
    return new Payment({
      channelId: paymentChannel.channelId,
      sender: paymentChannel.sender,
      receiver: paymentChannel.receiver,
      price: paymentRequired.price,
      value,
      channelValue: paymentChannel.value,
      v: signature.v,
      r: '0x' + signature.r.toString('hex'),
      s: '0x' + signature.s.toString('hex'),
      meta: paymentRequired.meta,
      contractAddress: paymentChannel.contractAddress,
      token: undefined
    })
  }

  static serialize (payment: Payment): object {
    return {
      channelId: payment.channelId.toString(),
      value: payment.value.toString(),
      sender: payment.sender,
      receiver: payment.receiver,
      price: payment.price.toString(),
      channelValue: payment.channelValue.toString(),
      v: Number(payment.v),
      r: payment.r,
      s: payment.s,
      contractAddress: payment.contractAddress,
      token: payment.token
    }
  }
}

export class PaymentSerde implements Serde<Payment> {
  static instance: PaymentSerde = new PaymentSerde()

  static required = [
    'channelId',
    'value',
    'sender',
    'receiver',
    'price',
    'channelValue',
    'v',
    'r',
    's',
    'contractAddress'
  ]

  serialize (obj: Payment): object {
    return {
      channelId: obj.channelId.toString(),
      value: obj.value.toString(),
      sender: obj.sender,
      receiver: obj.receiver,
      price: obj.price.toString(),
      channelValue: obj.channelValue.toString(),
      v: Number(obj.v),
      r: obj.r,
      s: obj.s,
      contractAddress: obj.contractAddress,
      token: obj.token
    }
  }

  deserialize (data: any): Payment {
    PaymentSerde.required.forEach((field: string) => {
      if (!data[field]) {
        throw new Error(`Required field not found: ${field}`)
      }
    })

    return new Payment({
      channelId: data.channelId,
      value: new BigNumber.BigNumber(data.value),
      sender: data.sender,
      receiver: data.receiver,
      price: new BigNumber.BigNumber(data.price),
      channelValue: new BigNumber.BigNumber(data.channelValue),
      v: Number(data.v),
      r: data.r,
      s: data.s,
      contractAddress: data.contractAddress,
      token: data.token,
      meta: data.meta
    })
  }
}
