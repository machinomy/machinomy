'use strict'

const request = require('request')
const log = require('./log')
const configuration = require('./configuration')

var Transport = function () {

}

/**
 * Request URI sending a paywall token.
 * @param {string} uri
 * @param {string} token
 * @param {function(string, Object)} callback
 */
Transport.prototype.getWithToken = function (uri, token, callback) {
  var options = {
    method: 'GET',
    uri: uri,
    headers: {
      'authorization': 'Paywall ' + token
    }
  }
  log.verbose(`Getting ${uri} using access token`)
  log.debug(options)
  request(options, callback)
}

Transport.prototype.get = function (uri, headers, callback) {
  var options = {
    method: 'GET',
    uri: uri,
    headers: headers
  }
  log.verbose(`Getting ${uri} using headers:`, JSON.stringify(headers))
  request(options, callback)
}

/**
 * Request token from the server's gateway
 * @param {string} uri - Full url to the gateway.
 * @param {Payment} payment
 * @param {function(string, string|null)} callback - callback(error, token)
 */
Transport.prototype.requestToken = function (uri, payment, callback) {
  var options = {
    method: 'POST',
    uri: uri,
    json: true,
    body: payment
  }
  log.verbose('Getting request token in exchange for payment')
  log.debug(payment)
  request(options, function (error, response) {
    if (error) {
      log.verbose('Can not find a token in the response')
      callback(error, null)
    } else {
      var token = response.headers['paywall-token']
      if (token) {
        log.verbose('Got token from the server')
        callback(error, token)
      } else {
        callback('Can not find a token in the response', null)
      }
    }
  })
}

var PaymentRequired = function (headers) {
  this.receiver = headers['paywall-address']
  this.price = Number(headers['paywall-price'])
  this.gateway = headers['paywall-gateway']
}

/**
 * @param {Object} headers
 * @returns {PaymentRequired}
 */
PaymentRequired.parse = function (headers) {
  return new PaymentRequired(headers)
}

module.exports = {
  Transport: Transport,
  PaymentRequired: PaymentRequired
}
