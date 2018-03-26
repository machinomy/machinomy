import * as BigNumber from 'bignumber.js'
import Serde from './serde'
import Signature from './signature'

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
  contractAddress?: string
  token: string | undefined
  createdAt?: number
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
  contractAddress: string | undefined
  token: string | undefined
  createdAt?: number

  constructor (options: Payment) {
    this.channelId = options.channelId
    this.sender = options.sender
    this.receiver = options.receiver
    this.price = options.price
    this.value = options.value
    this.channelValue = options.channelValue
    this.signature = options.signature
    this.meta = options.meta
    this.contractAddress = options.contractAddress
    this.token = options.token
    this.createdAt = options.createdAt
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

  serialize (obj: Payment): object {
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
      contractAddress: obj.contractAddress,
      token: obj.token,
      meta: obj.meta,
      createdAt: obj.createdAt
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
      contractAddress: data.contractAddress,
      token: data.token,
      meta: data.meta,
      createdAt: Number(data.createdAt)
    })
  }
}
