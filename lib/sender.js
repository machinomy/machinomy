'use strict'

const Promise = require('bluebird')
const _ = require('lodash')

const transport = require('./transport')
const channel = require('./channel')
const log = require('./log')
const configuration = require('./configuration')

const VERSION = configuration.VERSION

class Sender {
  /**
   * @param {Web3} web3
   * @param {string} account
   * @param {ChannelContract} contract
   * @param {Transport} transport
   * @param {Storage} storage
   */
  constructor (web3, account, contract, transport, storage) {
    this.web3 = web3
    this.account = account
    this.contract = contract
    this.transport = transport
    this.storage = storage
  }

  /**
   * Make request to +uri+ building a new payment channel. Returns HTTP response.
   *
   * @param {string} uri
   * @param {PaymentRequired} paymentRequired
   * @param {number} channelValue
   * @param {{uri: string, headers: object, onWillPreflight: function, onDidPreflight: function, onWillOpenChannel: function, onDidOpenChannel: function, onWillSendPayment: function, onDidSendPayment: function, onWillLoad: function, onDidLoad: function}} opts
   * @return {Promise<[Payment, Object]>}
   */
  freshChannel (uri, paymentRequired, channelValue, opts = {}) {
    if (_.isFunction(opts.onWillOpenChannel)) {
      opts.onWillOpenChannel()
    }
    return this.contract.buildPaymentChannel(this.account, paymentRequired.receiver, channelValue).then(paymentChannel => {
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
  existingChannel (uri, paymentRequired, paymentChannel, opts = {}) {
    return channel.Payment.fromPaymentChannel(this.web3, paymentChannel, paymentRequired.price).then(payment => {
      let nextPaymentChannel = channel.PaymentChannel.fromPayment(payment)
      return this.storage.channels.saveOrUpdate(nextPaymentChannel).then(() => {
        return this.transport.requestToken(paymentRequired.gateway, payment, opts)
      }).then(token => {
        return this.transport.getWithToken(uri, token).then(response => {
          return [payment, response]
        })
      })
    })
  }

  /**
   * Determine if channel can be used.
   *
   * @param {PaymentChannel} paymentChannel
   * @param {PaymentRequired} paymentRequired
   * @return {Promise<boolean>}
   */
  canUseChannel (paymentChannel, paymentRequired) {
    return this.contract.getState(paymentChannel.channelId).then(state => {
      let isOpen = state === 0 // FIXME Harmonize channel states
      log.debug(`canUseChannel: isOpen: ${isOpen}`)
      let funded = paymentChannel.value >= (paymentChannel.spent + paymentRequired.price)
      log.debug(`canUseChannel: funded: ${funded}`)
      return isOpen && funded
    })
  }

  /**
   * @param {object} response
   * @return {Promise<PaymentRequired>}
   */
  extractPaymentRequired (response) {
    let version = response.headers['paywall-version']
    if (version === VERSION) {
      let paymentRequired = transport.PaymentRequired.parse(response.headers)
      return Promise.resolve(paymentRequired)
    } else {
      return Promise.reject(new Error(`Unsupported version ${version}, expected ${VERSION}`))
    }
  }

  /**
   * @param {PaymentRequired} paymentRequired
   * @return {Promise<PaymentChannel>}
   */
  findOpenChannel (paymentRequired) {
    return this.storage.channels.allByQuery({sender: this.account, receiver: paymentRequired.receiver}).then(paymentChannels => {
      return Promise.filter(paymentChannels, paymentChannel => {
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
   * @param uri
   * @param preFlightResponse
   * @param {{uri: string, headers: object, onWillPreflight: function, onDidPreflight: function, onWillOpenChannel: function, onDidOpenChannel: function, onWillSendPayment: function, onDidSendPayment: function, onWillLoad: function, onDidLoad: function}} opts
   * @return {Promise<[Payment, Object]>}
   */
  handlePaymentRequired (uri, preFlightResponse, opts = {}) {
    log.info('Handling 402 Payment Required response')
    return this.extractPaymentRequired(preFlightResponse).then(paymentRequired => {
      return this.findOpenChannel(paymentRequired).then(paymentChannel => {
        if (paymentChannel) {
          return this.existingChannel(uri, paymentRequired, paymentChannel)
        } else {
          let value = paymentRequired.price * 10 // FIXME Total value of the channel
          return this.freshChannel(uri, paymentRequired, value, opts) // Build new channel
        }
      })
    })
  }

  /**
   * Get the payment required to access the resource.
   *
   * @param {string} uri
   * @return {Promise<PaymentRequired>}
   */
  pry (uri) {
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
  buy (opts) {
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
          return this.handlePaymentRequired(uri, response, opts)
        default:
        // Do Something
      }
    })
  }
}

/**
 * Build instance of Sender.
 *
 * @param {Web3} web3
 * @param {string} account
 * @param {ChannelContract} contract
 * @param {Transport} transport
 * @param {Storage} storage
 * @return {Sender}
 */
const build = (web3, account, contract, transport, storage) => {
  return new Sender(web3, account, contract, transport, storage)
}

module.exports = {
  build: build
}
