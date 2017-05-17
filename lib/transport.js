'use strict'

const Promise = require('bluebird')
const _ = require('lodash')
const request = Promise.promisify(require('request'))

const log = require('./log')

// noinspection MagicNumberJS
const STATUS_CODES = {
  PAYMENT_REQUIRED: 402
}

/**
 * Parse response headers and return the token.
 *
 * @param {object} response
 * @return {string}
 */
const extractPaywallToken = (response) => {
  let token = response.headers['paywall-token']
  if (token) {
    log.info('Got token from the server')
    return token
  } else {
    throw new Error('Can not find a token in the response')
  }
}

class Transport {

  /**
   * @param {function|null} _request
   */
  constructor (_request) {
    this.request = _request
  }

  /**
   * Request URI sending a paywall token.
   * @param {string} uri
   * @param {string} token
   * @param {{uri: string, headers: object, onWillPreflight: function, onDidPreflight: function, onWillOpenChannel: function, onDidOpenChannel: function, onWillSendPayment: function, onDidSendPayment: function, onWillLoad: function, onDidLoad: function}} opts
   * @return {Promise<object>}
   */
  getWithToken (uri, token, opts = {}) {
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

  /**
   * @param {string} uri
   * @param {object|null} headers
   * @return {Promise<object>}
   */
  get (uri, headers = null) {
    let options = {
      method: 'GET',
      uri: uri,
      headers: headers
    }
    log.info(`Getting ${uri} using headers:`, JSON.stringify(headers))
    log.debug(options)
    return this.request(options)
  }

  /**
   * Request token from the server's gateway
   * @param {string} uri - Full url to the gateway.
   * @param {Payment} payment
   * @param {{uri: string, headers: object, onWillPreflight: function, onDidPreflight: function, onWillOpenChannel: function, onDidOpenChannel: function, onWillSendPayment: function, onDidSendPayment: function, onWillLoad: function, onDidLoad: function}} opts
   * @return {Promise<string>}
   */
  requestToken (uri, payment, opts = {}) {
    let options = {
      method: 'POST',
      uri: uri,
      json: true,
      body: payment
    }
    log.info('Getting request token in exchange for payment')
    log.debug(payment)
    if (_.isFunction(opts.onWillSendPayment)) {
      opts.onWillSendPayment()
    }
    return this.request(options).then(extractPaywallToken).then(result => {
      if (_.isFunction(opts.onDidSendPayment)) {
        opts.onDidSendPayment()
      }
      return result
    })
  }
}

class PaymentRequired {
  /**
   * @param {string} receiver
   * @param {number} price
   * @param {string} gateway
   */
  constructor (receiver, price, gateway) {
    this.receiver = receiver
    this.price = price
    this.gateway = gateway
  }
}

/**
 * @param {Object} headers
 * @returns {PaymentRequired}
 */
PaymentRequired.parse = function (headers) {
  let receiver = headers['paywall-address']
  let price = Number(headers['paywall-price'])
  let gateway = headers['paywall-gateway']
  return new PaymentRequired(receiver, price, gateway)
}

/**
 * Build Transport instance.
 *
 * @param {function} _request
 * @return {Transport}
 */
const build = (_request = null) => {
  return new Transport(_request || request)
}

module.exports = {
  STATUS_CODES: STATUS_CODES,
  Transport: Transport,
  PaymentRequired: PaymentRequired,
  build: build
}
