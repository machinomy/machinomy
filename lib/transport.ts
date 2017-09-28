import Promise = require('bluebird')
import { Log } from 'typescript-logger'
import _ = require('lodash')
import { RequestResponse, RequiredUriUrl, CoreOptions } from 'request'
import Payment from './Payment'
const request: (opts: RequiredUriUrl & CoreOptions) => Promise<RequestResponse> = Promise.promisify(require('request'))

const log = Log.create('transport')

// noinspection MagicNumberJS
export const STATUS_CODES = {
  PAYMENT_REQUIRED: 402
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
    log.info('Got token from the server')
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
    log.info(`Getting ${uri} using access token ${token}`)
    if (_.isFunction(opts.onWillLoad)) {
      opts.onWillLoad()
    }
    return this.get(uri, headers).then(result => {
      if (_.isFunction(opts.onDidLoad)) {
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
    log.info(`Getting ${uri} using headers and options`, headers, options)
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
    if (!payment.contractAddress) {
      delete payment.contractAddress
    }
    let options = {
      method: 'POST',
      uri: uri,
      json: true,
      body: payment
    }
    log.info('Getting request token in exchange for payment', payment)
    if (_.isFunction(opts.onWillSendPayment)) {
      opts.onWillSendPayment()
    }
    return request(options).then(extractPaywallToken).then(result => {
      if (_.isFunction(opts.onDidSendPayment)) {
        opts.onDidSendPayment()
      }
      return result
    })
  }
}

export class PaymentRequired {
  receiver: string
  price: number
  gateway: string
  contractAddress: string

  constructor (receiver: string, price: number, gateway: string, contractAddress: string) {
    this.receiver = receiver
    this.price = price
    this.gateway = gateway
    this.contractAddress = contractAddress
  }

  static parse = function (headers: any): PaymentRequired {
    let receiver = headers['paywall-address']
    let price = Number(headers['paywall-price'])
    let gateway = headers['paywall-gateway']
    let contractAddress = headers['paywall-token-address']
    return new PaymentRequired(receiver, price, gateway, contractAddress)
  }
}

/**
 * Build Transport instance.
 */
export const build = (): Transport => {
  return new Transport()
}
