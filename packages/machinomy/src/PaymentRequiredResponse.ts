import * as BigNumber from 'bignumber.js'
import { TransportVersionNotSupportError } from './Exceptions'

export const TRANSPORT_VERSION = '0.0.3'

export class PaymentRequiredResponse {
  price: BigNumber.BigNumber
  receiver: string
  gateway: string
  tokenContract: string
  meta: any

  constructor (price: BigNumber.BigNumber, receiver: string, gateway: string, tokenContract: string, meta: any) {
    this.price = price
    this.receiver = receiver
    this.gateway = gateway
    this.tokenContract = tokenContract
    this.meta = meta
  }
}

export class PaymentRequiredResponseSerializer {
  static instance: PaymentRequiredResponseSerializer = new PaymentRequiredResponseSerializer()

  serialize (obj: PaymentRequiredResponse, headers: any): any {
    headers['paywall-address'] = obj.receiver
    headers['paywall-price'] = obj.price.toString()
    headers['paywall-gateway'] = obj.gateway
    headers['paywall-token-contract'] = obj.tokenContract
    headers['paywall-meta'] = obj.meta
    headers['paywall-version'] = TRANSPORT_VERSION
    return headers
  }

  deserialize (headers: any): PaymentRequiredResponse {
    if (!headers['paywall-version'] || headers['paywall-version'] !== TRANSPORT_VERSION) {
      throw new TransportVersionNotSupportError()
    }
    return {
      price: new BigNumber.BigNumber(headers['paywall-price']),
      receiver: headers['paywall-address'],
      gateway: headers['paywall-gateway'],
      tokenContract: headers['paywall-token-contract'],
      meta: headers['paywall-meta']
    }
  }
}
