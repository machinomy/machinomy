'use strict'

const request = require('request')
const urljoin = require('url-join')
const channel = require('./channel')
const log = require('./log')
const configuration = require('./configuration')

const VERSION = configuration.VERSION

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

var Client = function (account, contract, transport, storage) {
  /**
   * @type {string}
   */
  this.sender = account

  /**
   * @type {ChannelContract}
   */
  this.contract = contract

  /**
   * @type {Transport}
   */
  this.transport = transport

  /**
   * @type {Storage}
   */
  this.storage = storage
}

Client.prototype.freshChannel = function (uri, response, paymentRequired, valueCallback) {
  var self = this
  let channels = self.storage._channels
  valueCallback(null, paymentRequired.price, function (error, value, callback) { // Determine value of the channel
    if (error) throw error
    self.contract.buildPaymentChannel(self.sender, paymentRequired.receiver, value, function (error, paymentChannel) {
      if (error) throw error
      let payment = channel.Payment.fromPaymentChannel(paymentChannel, paymentRequired.price)
      channels.saveOrUpdate(paymentChannel).then(() => {
        let nextPaymentChannel = channel.PaymentChannel.fromPayment(payment)
        return channels.saveOrUpdate(nextPaymentChannel)
      }).then(() => {
        self.transport.requestToken(paymentRequired.gateway, payment, (error, token) => {
          if (error) throw error
          self.transport.getWithToken(uri, token, callback)
        })
      }).catch(error => {
        throw error
      })
    })
  })
}

Client.prototype.existingChannel = function (uri, response, paymentRequired, raw, valueCallback) {
  var self = this
  let channels = self.storage._channels
  valueCallback(null, paymentRequired.price, function (error, value, callback) {
    if (error) throw error
    var paymentChannel = new channel.PaymentChannel(raw.sender, raw.receiver, raw.channelId, null, raw.value, raw.spent)
    var payment = channel.Payment.fromPaymentChannel(paymentChannel, paymentRequired.price)
    var nextPaymentChannel = channel.PaymentChannel.fromPayment(payment)
    channels.saveOrUpdate(nextPaymentChannel).then(() => {
      self.transport.requestToken(paymentRequired.gateway, payment, function (error, token) {
        if (error) throw error
        self.transport.getWithToken(uri, token, callback)
      })
    }).catch(error => {
      throw error
    })
  })
}

Client.prototype.canUseChannel = function (paymentChannel, paymentRequired) {
  var isOpen = this.contract.getState(paymentChannel.channelId) === 0
  var funded = paymentChannel.value > (paymentChannel.spent + paymentRequired.price)
  return isOpen && funded
}

/**
 * Select handler based on version returned by server.
 * @param uri
 * @param response
 * @param valueCallback
 */
Client.prototype.handlePaymentRequired = function (uri, response, valueCallback) {
  log.verbose('Handling 402 Payment Required response')
  var self = this
  let channels = this.storage._channels
  var version = response.headers['paywall-version']
  if (version === VERSION) {
    var paymentRequired = PaymentRequired.parse(response.headers)
    channels.allByQuery({sender: self.sender, receiver: paymentRequired.receiver}).then(docs => {
      var openChannels = []
      for (let doc of docs) {
        if (self.canUseChannel(doc, paymentRequired)) {
          openChannels.push(doc)
        }
      }
      if (openChannels.length === 0) {
        // Build new channel
        self.freshChannel(uri, response, paymentRequired, valueCallback)
      } else if (openChannels.length === 1) {
        self.existingChannel(uri, response, paymentRequired, openChannels[0], valueCallback)
      } else {
        // Do Something
        throw new Error(`Found more than one channel from ${self.sender} to ${paymentRequired.receiver}`)
      }
    })
  } else {
    // Do Something
    valueCallback(`Unsupported version ${version}, expected ${VERSION}`, null)
  }
}

Client.prototype.pry = function (uri, callback) {
  var self = this
  self.transport.get(uri, {}, function (error, response) {
    if (error) {
      callback(error)
    } else {
      switch (response.statusCode) {
        case 402:
          var version = response.headers['paywall-version']
          if (version === VERSION) {
            var paymentRequired = PaymentRequired.parse(response.headers)
            callback(null, paymentRequired)
          } else {
            callback(`Unsupported version ${version}, expected ${VERSION}`, null)
          }
          break
        default:
          callback('No payment required', null)
      }
    }
  })
}

Client.prototype.buy = function (uri, callback) {
  var self = this
  self.transport.get(uri, {}, function (error, response) {
    if (error) {
      callback(error)
    } else {
      switch (response.statusCode) {
        case 402:
          self.handlePaymentRequired(uri, response, callback)
          break
        default:
        // Do Something
      }
    }
  })
}

/**
 * Server side.
 * @param {string} receiver
 * @param {string} baseUri - Base URI of the server, like "http://example.com"
 * @param {Storage} storage
 * @constructor
 */
var Server = function (receiver, baseUri, storage) {
  this.receiver = receiver
  this.gatewayUri = urljoin(baseUri, configuration.PAYWALL_PATH)
  this.storage = storage
}

Server.prototype.paywallHeaders = function (price) {
  var headers = {}
  headers['Paywall-Version'] = VERSION
  headers['Paywall-Price'] = price
  headers['Paywall-Address'] = this.receiver
  headers['Paywall-Gateway'] = this.gatewayUri
  return headers
}

/**
 * @param {Payment} payment
 * @param {PaymentChannel} paymentChannel
 */
var isPaymentValid = function (payment, paymentChannel) {
  var validIncrement = (paymentChannel.spent + payment.price) <= paymentChannel.value
  var validChannelValue = paymentChannel.value === payment.channelValue
  var validPaymentValue = paymentChannel.value <= payment.channelValue
  return validIncrement && validChannelValue && validPaymentValue
}

/**
 * Accept or reject payment.
 *
 * @param {Payment} payment
 * @param {function} callback
 */
Server.prototype.acceptPayment = function (payment, callback) {
  var self = this

  if (payment.receiver !== self.receiver) {
    throw new Error(`Receiver must be ${self.receiver}`)
  }

  let channels = self.storage._channels
  let tokens = self.storage._tokens
  let payments = self.storage._payments
  let query = {sender: payment.sender, receiver: payment.receiver, channelId: payment.channelId}
  channels.allByQuery(query).then(docs => {
    var token, paymentChannel
    if (docs.length === 0) {
      token = channel.web3.sha3(JSON.stringify(payment))
      paymentChannel = channel.PaymentChannel.fromPayment(payment)
      channels.saveOrUpdate(paymentChannel).then(() => {
        return tokens.save(token, payment.channelId)
      }).then(() => {
        return payments.save(token, payment)
      }).then(() => {
        callback(null, token)
      }).catch(error => {
        callback(error, null)
      })
    } else if (docs.length === 1) {
      var doc = docs[0]
      paymentChannel = new channel.PaymentChannel(doc.sender, doc.receiver, doc.channelId, null, doc.value, doc.spent)
      log.debug(paymentChannel)
      if (isPaymentValid(payment, paymentChannel)) {
        token = channel.web3.sha3(JSON.stringify(payment))
        var nextPaymentChannel = channel.PaymentChannel.fromPayment(payment)
        channels.saveOrUpdate(nextPaymentChannel).then(() => {
          return tokens.save(token, payment.channelId)
        }).then(() => {
          return payments.save(token, payment)
        }).then(() => {
          callback(null, token)
        }).catch(error => {
          callback(error, null)
        })
      } else {
        log.error(`Invalid payment. Closing the channel ${paymentChannel.channelId}`)
        payments.firstMaximum(paymentChannel.channelId).then(paymentDoc => {
          callback(null, null)
          channel.contract.claim(self.receiver, paymentDoc.channelId, paymentDoc.value, paymentDoc.v, paymentDoc.r, paymentDoc.s, function (error, claimedValue) {
            if (error) throw error
            log.info(`Claimed ${claimedValue} from channel ${paymentDoc.channelId}`)
          })
        }).catch(error => {
          callback(error, null)
        })
      }
    } else {
      throw new Error('More than one channel found. Must be an error') // Do Something
    }
  })
}

Server.prototype.acceptToken = function (token, callback) {
  let tokens = this.storage._tokens
  tokens.isPresent(token).then(isPresent => {
    callback(isPresent)
  }).catch(error => {
    throw error
  })
}

module.exports = {
  Server: Server,
  Transport: Transport,
  Client: Client
}
