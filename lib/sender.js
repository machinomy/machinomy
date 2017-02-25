'use strict'

const transport = require('./transport')
const channel = require('./channel')
const log = require('./log')
const configuration = require('./configuration')

const VERSION = configuration.VERSION

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
  let channels = self.storage.channels
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
  let channels = self.storage.channels
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
  let channels = this.storage.channels
  var version = response.headers['paywall-version']
  if (version === VERSION) {
    var paymentRequired = transport.PaymentRequired.parse(response.headers)
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
            var paymentRequired = transport.PaymentRequired.parse(response.headers)
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

const build = (account, contract, transport, storage) => {
  return new Client(account, contract, transport, storage)
}

module.exports = {
  build: build
}
