'use strict'

const storage = require('./storage')
const receiver = require('./receiver')
const channel = require('./channel')
const configuration = require('./configuration')
const log = require('./log')
const urljoin = require('url-join')

const HEADER_NAME = 'authorization'
const TOKEN_NAME = 'paywall'

/**
 * @callback gotTokenCallback
 * @param {null|string} error
 * @param {string|null} token
 */

/**
 * @param {Object} req - Incoming http request.
 * @param {gotTokenCallback} callback
 */
const parseToken = (req, callback) => {
  let content = req.get(HEADER_NAME)
  if (content) {
    log.debug('Authorization header: ' + content)
    let authorization = content.split(' ')
    let type = authorization[0].toLowerCase()
    let token = authorization[1]
    if (type === TOKEN_NAME) {
      callback(null, token)
    } else {
      callback(`Invalid ${HEADER_NAME} token name present. Expected ${TOKEN_NAME}, got ${type}`, null)
    }
  } else {
    callback(`No ${HEADER_NAME} header present`, null)
  }
}

/**
 *
 * @param {String} account
 * @param {String} address - full URI of the server, like 'http://example.com'
 * @param {Storage|null} _storage
 * @constructor
 */
var Paywall = function (account, address, _storage) {
  var settings = configuration.receiver()
  log.debug('Use settings for receiver', settings)
  _storage = _storage || new storage.Storage(settings.databaseFile, 'receiver')
  this.receiverAccount = account
  this.gatewayUri = urljoin(address, configuration.PAYWALL_PATH)
  this.server = receiver.build(account, _storage)
}

Paywall.TOKEN_NAME = 'paywall'

/**
 * Require payment before serving the request.
 *
 * @param {Number, Function} price
 * @param {Function} callback
 * @returns {Function}
 */
Paywall.prototype.guard = function (price, callback) {
  let _guard = (fixedPrice, req, res, error, token) => {
    if (error) {
      log.error(error)
      this.paymentRequired(fixedPrice, req, res)
    } else {
      this.server.acceptToken(token).then(isOk => {
        if (isOk) {
          log.verbose('Got valid paywall token')
          callback(req, res)
        } else {
          log.warn('Got invalid paywall token')
          this.paymentInvalid(fixedPrice, req, res)
        }
      })
    }
  }

  return (req, res) => {
    log.info(`Requested ${req.path}`)
    parseToken(req, (error, token) => {
      if (typeof price === 'function') {
        price(req, fixedPrice => {
          _guard(fixedPrice, req, res, error, token)
        })
      } else {
        _guard(price, req, res, error, token)
      }
    })
  }
}

/**
 * Server-side headers that require payments.
 *
 * @param {string} receiverAccount - Ethereum account of the receiver
 * @param {string} gatewayUri - URI to the paywall gateway
 * @param {number} price
 * @returns {{}}
 */
const paywallHeaders = (receiverAccount, gatewayUri, price) => {
  let headers = {}
  headers['Paywall-Version'] = configuration.VERSION
  headers['Paywall-Price'] = price
  headers['Paywall-Address'] = receiverAccount
  headers['Paywall-Gateway'] = gatewayUri
  return headers
}

Paywall.prototype.paymentRequired = function (price, req, res) {
  log.info('Require payment ' + price + ' for ' + req.path)
  res.status(402)
    .set(paywallHeaders(this.receiverAccount, this.gatewayUri, price))
    .send('Payment Required')
    .end()
}

Paywall.prototype.paymentInvalid = function (price, req, res) {
  res.status(409) // Conflict
    .set(paywallHeaders(this.receiverAccount, this.gatewayUri, price))
    .send('Payment Invalid')
    .end()
}

Paywall.prototype.middleware = function () {
  var self = this
  var handler = function (req, res) {
    var payment = new channel.Payment(req.body)
    self.server.acceptPayment(payment, function (error, token) {
      if (error) throw error
      res.status(202)
        .append('Paywall-Token', token)
        .send('Accepted')
        .end()
    })
  }
  return function (req, res, next) {
    if (req.url === '/' + configuration.PAYWALL_PATH) {
      handler(req, res)
    } else {
      next()
    }
  }
}

module.exports = {
  Paywall: Paywall
}
