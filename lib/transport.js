'use strict'

const Promise = require('bluebird')
const request = require('request')

const log = require('./log')

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
   * @param {function(string, Object)} callback
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
   * @param {function(string, string|null)} callback - callback(error, token)
   */
  requestToken (uri, payment, callback) {
    let options = {
      method: 'POST',
      uri: uri,
      json: true,
      body: payment
    }
    log.verbose('Getting request token in exchange for payment')
    log.debug(payment)
    request(options, (error, response) => {
      if (error) {
        log.verbose('Can not find a token in the response')
        callback(error, null)
      } else {
        let token = response.headers['paywall-token']
        if (token) {
          log.verbose('Got token from the server')
          callback(error, token)
        } else {
          callback('Can not find a token in the response', null)
        }
      }
    })
  }
}

class PaymentRequired {
  constructor (headers) {
    this.receiver = headers['paywall-address']
    this.price = Number(headers['paywall-price'])
    this.gateway = headers['paywall-gateway']
  }
}

/**
 * @param {Object} headers
 * @returns {PaymentRequired}
 */
PaymentRequired.parse = function (headers) {
  return new PaymentRequired(headers)
}

/**
 * Build Transport instance.
 *
 * @param {function} _request
 * @return {Transport}
 */
const build = (_request = null) => {
  return new Transport(_request || Promise.promisify(require('request')))
}

module.exports = {
  Transport: Transport,
  PaymentRequired: PaymentRequired,
  build: build
}
