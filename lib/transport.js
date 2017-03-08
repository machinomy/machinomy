'use strict'

const Promise = require('bluebird')
const request = Promise.promisify(require('request'))

const log = require('./log')

/**
 * Parse response headers and return the token.
 *
 * @param {object} response
 * @return {string}
 */
const extractPaywallToken = (response) => {
  let token = response.headers['paywall-token']
  if (token) {
    log.verbose('Got token from the server')
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
   * @return {Promise<object>}
   */
  getWithToken (uri, token) {
    let headers = {
      'authorization': 'Paywall ' + token
    }
    log.verbose(`Getting ${uri} using access token ${token}`)
    return this.get(uri, headers)
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
    log.verbose(`Getting ${uri} using headers:`, JSON.stringify(headers))
    log.debug(options)
    return this.request(options)
  }

  /**
   * Request token from the server's gateway
   * @param {string} uri - Full url to the gateway.
   * @param {Payment} payment
   * @return {Promise<string>}
   */
  requestToken (uri, payment) {
    let options = {
      method: 'POST',
      uri: uri,
      json: true,
      body: payment
    }
    log.verbose('Getting request token in exchange for payment')
    log.debug(payment)
    return this.request(options).then(extractPaywallToken)
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
  Transport: Transport,
  PaymentRequired: PaymentRequired,
  build: build
}
