'use strict'

const urljoin = require('url-join')
const channel = require('./channel')
const log = require('./log')
const configuration = require('./configuration')

const VERSION = configuration.VERSION

/**
 * @param {Payment} payment
 * @param {PaymentChannel} paymentChannel
 */
const isPaymentValid = (payment, paymentChannel) => {
  let validIncrement = (paymentChannel.spent + payment.price) <= paymentChannel.value
  let validChannelValue = paymentChannel.value === payment.channelValue
  let validPaymentValue = paymentChannel.value <= payment.channelValue
  return validIncrement && validChannelValue && validPaymentValue
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

  let channels = self.storage.channels
  let tokens = self.storage.tokens
  let payments = self.storage.payments
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
  let tokens = this.storage.tokens
  tokens.isPresent(token).then(isPresent => {
    callback(isPresent)
  }).catch(error => {
    throw error
  })
}

/**
 * Build receiver side of a payment channel.
 *
 * @param account
 * @param baseUri
 * @param storage
 * @returns {Server}
 */
const build = (account, baseUri, storage) => {
  return new Server(account, baseUri, storage)
}

module.exports = {
  build: build
}
