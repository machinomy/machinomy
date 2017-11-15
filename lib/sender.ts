import Bluebird = require('bluebird')
import { Log } from 'typescript-logger'
import _ = require('lodash')
import Web3 = require('web3')

import * as transport from './transport'
import * as channel from './channel'
import * as configuration from './configuration'
import { ChannelContract, PaymentChannel } from './channel'
import { PaymentRequired, RequestTokenOpts, Transport } from './transport'
import Storage from './storage'
import { RequestResponse } from 'request'
import Payment from './Payment'
import BigNumber from 'bignumber.js'

const log = Log.create('sender')

const VERSION = configuration.VERSION

export interface FreshChannelOpts extends RequestTokenOpts {
  onWillOpenChannel?: () => void
  onDidOpenChannel?: () => void
}

export interface BuyOpts extends FreshChannelOpts {
  uri: string
  headers?: object
  onWillPreflight?: () => void
  onDidPreflight?: () => void
}

export interface PaymentPair {
  payment: Payment
  response: RequestResponse
}

export interface Headers {
  [key: string]: any
}

export interface ResponseHeaders {
  headers: Headers
}

export default class Sender {
  web3: Web3
  account: string
  contract: ChannelContract
  transport: Transport
  storage: Storage
  minimumChannelAmount: BigNumber

  constructor (web3: Web3, account: string, contract: ChannelContract, transport: Transport, storage: Storage, minimumChannelAmount: BigNumber = new BigNumber(0)) {
    this.web3 = web3
    this.account = account
    this.contract = contract
    this.transport = transport
    this.storage = storage
    this.minimumChannelAmount = minimumChannelAmount
  }

  /**
   * Make request to +uri+ building a new payment channel. Returns HTTP response.
   */
  freshChannel (uri: string, paymentRequired: PaymentRequired, channelValue: BigNumber, opts: FreshChannelOpts = {}): Promise<any> {
    if (_.isFunction(opts.onWillOpenChannel)) {
      opts.onWillOpenChannel()
    }
    return this.contract.buildPaymentChannel(this.account, paymentRequired, channelValue).then((paymentChannel: PaymentChannel) => {
      if (_.isFunction(opts.onDidOpenChannel)) {
        opts.onDidOpenChannel()
      }
      return this.existingChannel(uri, paymentRequired, paymentChannel, opts)
    })
  }

  /**
   * Make request to +uri+ reusing an existing payment channel. Returns HTTP response.
   *
   * @param {string} uri
   * @param {PaymentRequired} paymentRequired
   * @param {PaymentChannel} paymentChannel
   * @param {{uri: string, headers: object, onWillPreflight: function, onDidPreflight: function, onWillOpenChannel: function, onDidOpenChannel: function, onWillSendPayment: function, onDidSendPayment: function, onWillLoad: function, onDidLoad: function}} opts
   * @return {Promise<[Payment, Object]>}
   */
  existingChannel (uri: string, paymentRequired: PaymentRequired, paymentChannel: PaymentChannel, opts: RequestTokenOpts = {}): Promise<any> {
    return Payment.fromPaymentChannel(this.web3, paymentChannel, paymentRequired).then(payment => {
      let nextPaymentChannel = channel.PaymentChannel.fromPayment(payment)
      return this.storage.channels.saveOrUpdate(nextPaymentChannel).then(() => {
        return this.transport.requestToken(paymentRequired.gateway, payment, opts)
      }).then(token => {
        return {payment, token}
      })
    })
  }

  /**
   * Determine if channel can be used.
   */
  canUseChannel (paymentChannel: PaymentChannel, paymentRequired: PaymentRequired): Promise<boolean> {
    return this.contract.getState(paymentChannel).then(state => {
      let isOpen = state === 0 // FIXME Harmonize channel states
      // log.debug(`canUseChannel: isOpen: ${isOpen}`)
      let funded = paymentChannel.value.greaterThanOrEqualTo(paymentChannel.spent.plus(paymentRequired.price))
      // log.debug(`canUseChannel: funded: ${funded}`)
      return isOpen && funded
    })
  }

  extractPaymentRequired (response: ResponseHeaders): Promise<PaymentRequired> {
    let headers = response.headers
    if (!headers['paywall-version']) return Promise.reject(new Error(`Not found 'paywall-version' in headers`))
    if (!headers['paywall-address']) return Promise.reject(new Error(`Not found 'paywall-address' in headers`))
    if (!headers['paywall-price']) return Promise.reject(new Error(`Not found 'paywall-price' in headers`))
    if (!headers['paywall-gateway']) return Promise.reject(new Error(`Not found 'paywall-gateway' in headers`))

    let version = response.headers['paywall-version']
    if (version === VERSION) {
      let paymentRequired = transport.PaymentRequired.parse(response.headers)
      return Promise.resolve(paymentRequired)
    } else {
      return Promise.reject(new Error(`Unsupported version ${version}, expected ${VERSION}`))
    }
  }

  findOpenChannel (paymentRequired: PaymentRequired): Promise<PaymentChannel | undefined> {
    return this.storage.channels.allByQuery({ sender: this.account, receiver: paymentRequired.receiver }).then(paymentChannels => {
      return Bluebird.filter(paymentChannels, paymentChannel => {
        return this.canUseChannel(paymentChannel, paymentRequired)
      }).then(openChannels => {
        if (openChannels.length > 1) {
          log.warn(`Found more than one channel from ${this.account} to ${paymentRequired.receiver}`)
        }
        return _.head(openChannels)
      })
    })
  }

  /**
   * Select handler based on version returned by server.
   */
  handlePaymentRequired (uri: string, preFlightResponse: RequestResponse, opts: FreshChannelOpts = {}): Promise<any> {
    log.info('Handling 402 Payment Required response')
    return this.extractPaymentRequired(preFlightResponse).then(paymentRequired => {
      return this.findOpenChannel(paymentRequired).then(paymentChannel => {
        if (paymentChannel) {
          return this.existingChannel(uri, paymentRequired, paymentChannel)
        } else {
          let value = paymentRequired.price.times(10);
          if(this.minimumChannelAmount && this.minimumChannelAmount < value){
            value = this.minimumChannelAmount;
          }
          return this.freshChannel(uri, paymentRequired, value, opts) // Build new channel
        }
      })
    })
  }

  /**
   * Get the payment required to access the resource.
   */
  pry (uri: string): Promise<PaymentRequired> {
    return this.transport.get(uri).then(response => {
      switch (response.statusCode) {
        case transport.STATUS_CODES.PAYMENT_REQUIRED:
          let version = response.headers['paywall-version']
          if (version === VERSION) {
            return transport.PaymentRequired.parse(response.headers)
          } else {
            throw new Error(`Unsupported version ${version}, expected ${VERSION}`)
          }
        default:
          throw new Error('No payment required')
      }
    })
  }

  /**
   * Buy resource on +uri+. Get back with the response.
   *
   * @param {{uri: string, headers: null|object, onWillPreflight: null|function, onDidPreflight: null|function, onWillOpenChannel: null|function, onDidOpenChannel: null|function, onWillSendPayment: null|function, onDidSendPayment: null|function, onWillLoad: null|function, onDidLoad: null|function}} opts
   * @return {Promise<[Payment, Object]>}
   */
  buy (opts: BuyOpts): Promise<PaymentPair> {
    let uri = opts.uri
    let headers = opts.headers
    if (_.isFunction(opts.onWillPreflight)) {
      opts.onWillPreflight()
    }
    return this.transport.get(uri, headers).then(response => {
      if (_.isFunction(opts.onDidPreflight)) {
        opts.onDidPreflight()
      }
      switch (response.statusCode) {
        case transport.STATUS_CODES.PAYMENT_REQUIRED:
        case transport.STATUS_CODES.OK:
          return this.handlePaymentRequired(uri, response, opts).then((res: any) => {
            let payment = res.payment
            let token = res.token
            return this.transport.getWithToken(uri, token).then(response => {
              return {
                payment: payment,
                response: response
              }
            })
          })
        default:
          return Promise.reject(new Error(`Can not handle ${response.statusCode} response`))
      }
    })
  }

  buyMeta (options: any): any {
    let uri = 'http://localhost:3000/paid/erc20'
    let price = new BigNumber(options.price)
    if (price.isNaN() || !price.isFinite() || price.isNegative()) return Promise.reject(new Error('Price is incorrect'))
    let paymentRequired = new PaymentRequired(
      options.receiver,
      price,
      options.gateway,
      options.meta,
      options.contractAddress)

    return this.findOpenChannel(paymentRequired).then(paymentChannel => {
      if (paymentChannel) {
        return this.existingChannel(uri, paymentRequired, paymentChannel)
      } else {
        let value = paymentRequired.price.times(10);
        if(this.minimumChannelAmount && this.minimumChannelAmount > value){
          value = this.minimumChannelAmount;
        }
        console.error('value', value.toString())
        return this.freshChannel(uri, paymentRequired, value) // Build new channel
      }
    })
  }
}
