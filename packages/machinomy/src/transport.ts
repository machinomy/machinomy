import { RequestResponse, RequiredUriUrl, CoreOptions } from 'request'
import Payment from './payment'
import * as BigNumber from 'bignumber.js'
import Logger from '@machinomy/logger'
import { AcceptPaymentRequest, AcceptPaymentRequestSerde } from './accept_payment_request'
import { AcceptPaymentResponse, AcceptPaymentResponseSerde } from './accept_payment_response'
import { AcceptTokenRequest, AcceptTokenRequestSerde } from './accept_token_request'
import { AcceptTokenResponse, AcceptTokenResponseSerde } from './accept_token_response'
let req = require('request')

const request: (opts: RequiredUriUrl & CoreOptions) => Promise<RequestResponse> = (opts: RequiredUriUrl & CoreOptions) => {
  return new Promise((resolve: Function, reject: Function) => {
    req(opts, (err: Error, res: any) => {
      if (err) {
        reject(err)
      }
      resolve(res)
    })
  })
}

const LOG = new Logger('transport')

// noinspection MagicNumberJS
export const STATUS_CODES = {
  PAYMENT_REQUIRED: 402,
  OK: 200
}

/**
 * Parse response headers and return the token.
 *
 * @param {object} response
 * @return {string}
 */
const extractPaywallToken = (response: RequestResponse): string => {
  let token = response.headers['paywall-token'] as string
  if (token) {
    LOG.info('Got token from the server')
    return token
  } else {
    throw new Error('Can not find a token in the response')
  }
}

export interface GetWithTokenCallbacks {
  onWillLoad?: Function,
  onDidLoad?: Function
}

export interface RequestTokenOpts {
  onWillSendPayment?: Function
  onDidSendPayment?: Function
}

export class Transport {
    /**
     * Request URI sending a paywall token.
     * @return {Promise<object>}
     */
  getWithToken (uri: string, token: string, opts: GetWithTokenCallbacks = {}): Promise<RequestResponse> {
    let headers = {
      'authorization': 'Paywall ' + token
    }
    LOG.info(`Getting ${uri} using access token ${token}`)
    if (opts.onWillLoad) {
      opts.onWillLoad()
    }
    return this.get(uri, headers).then(result => {
      if (opts.onDidLoad) {
        opts.onDidLoad()
      }
      return result
    })
  }

  get (uri: string, headers?: object): Promise<RequestResponse> {
    let options = {
      method: 'GET',
      uri: uri,
      headers: headers
    }
    LOG.info(`Getting ${uri} using headers and options`, headers, options)
    return request(options)
  }

    /**
     * Request token from the server's gateway
     * @param {string} uri - Full url to the gateway.
     * @param {Payment} payment
     * @param {{uri: string, headers: object, onWillPreflight: function, onDidPreflight: function, onWillOpenChannel: function, onDidOpenChannel: function, onWillSendPayment: function, onDidSendPayment: function, onWillLoad: function, onDidLoad: function}} opts
     * @return {Promise<string>}
     */
  requestToken (uri: string, payment: Payment, opts: RequestTokenOpts = {}): Promise<string> {
    if (!payment.tokenContract) {
      delete payment.tokenContract
    }
    let options = {
      method: 'POST',
      uri: uri,
      json: true,
      body: payment
    }
    LOG.info('Getting request token in exchange for payment', payment)
    if (opts.onWillSendPayment) {
      opts.onWillSendPayment()
    }
    return request(options).then(extractPaywallToken).then(result => {
      if (opts.onDidSendPayment) {
        opts.onDidSendPayment()
      }
      return result
    })
  }

  async doPayment (paymentRequest: AcceptPaymentRequest, gateway: string): Promise<AcceptPaymentResponse> {
    const options = {
      method: 'POST',
      uri: gateway,
      json: true,
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: AcceptPaymentRequestSerde.instance.serialize(paymentRequest)
    }
    const res = await request(options)
    return AcceptPaymentResponseSerde.instance.deserialize(res.body)
  }

  async doVerify (tokenRequest: AcceptTokenRequest, gateway: string): Promise<AcceptTokenResponse> {
    const options = {
      method: 'POST',
      uri: gateway,
      json: true,
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: AcceptTokenRequestSerde.instance.serialize(tokenRequest)
    }

    const res = await request(options)

    return AcceptTokenResponseSerde.instance.deserialize(res.body)
  }
}

export class PaymentRequired {
  receiver: string
  price: BigNumber.BigNumber
  gateway: string
  meta: string
  tokenContract?: string

  constructor (receiver: string, price: BigNumber.BigNumber, gateway: string, meta: string, tokenContract?: string) {
    this.receiver = receiver
    this.price = price
    this.gateway = gateway
    this.meta = meta
    this.tokenContract = tokenContract
  }

  static parse = function (headers: any): PaymentRequired {
    let receiver = headers['paywall-address']
    let price = new BigNumber.BigNumber(headers['paywall-price'])
    let gateway = headers['paywall-gateway']
    let tokenContract = headers['paywall-token-contract']
    let meta = headers['paywall-meta']
    return new PaymentRequired(receiver, price, gateway, meta, tokenContract)
  }
}

/**
 * Build Transport instance.
 */
export const build = (): Transport => {
  return new Transport()
}
