import * as BigNumber from 'bignumber.js'
import Serde from './Serde'
import Signature from './Signature'

export interface PaymentJSON {
  channelId: string
  sender: string
  receiver: string
  price: BigNumber.BigNumber
  value: BigNumber.BigNumber
  channelValue: BigNumber.BigNumber
  v: number | string
  r: string
  s: string
  meta: string
  token: string | undefined
  createdAt?: number
  tokenContract?: string
}

export interface SerializedPayment {
  channelId: string
  value: string
  sender: string
  receiver: string
  price: string
  channelValue: string
  v: number
  r: string
  s: string
  token?: string
  meta: string
  createdAt?: number
  tokenContract?: string
}

export default class Payment {
  channelId: string
  sender: string
  receiver: string
  price: BigNumber.BigNumber
  value: BigNumber.BigNumber
  channelValue: BigNumber.BigNumber
  signature: Signature
  meta: string
  token: string | undefined
  createdAt?: number
  tokenContract?: string

  constructor (options: Payment) {
    this.channelId = options.channelId
    this.sender = options.sender
    this.receiver = options.receiver
    this.price = options.price
    this.value = options.value
    this.channelValue = options.channelValue
    this.signature = options.signature
    this.meta = options.meta
    this.token = options.token
    this.createdAt = options.createdAt
    this.tokenContract = options.tokenContract
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
    's'
  ]

  serialize (obj: Payment): SerializedPayment {
    const sig = obj.signature.toParts()

    return {
      channelId: obj.channelId.toString(),
      value: obj.value.toString(),
      sender: obj.sender,
      receiver: obj.receiver,
      price: obj.price.toString(),
      channelValue: obj.channelValue.toString(),
      v: sig.v,
      r: sig.r,
      s: sig.s,
      token: obj.token,
      meta: obj.meta,
      createdAt: obj.createdAt,
      tokenContract: obj.tokenContract
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
      signature: Signature.fromParts({
        v: Number(data.v),
        r: data.r,
        s: data.s
      }),
      token: data.token,
      meta: data.meta,
      createdAt: Number(data.createdAt),
      tokenContract: data.tokenContract
    })
  }
}
