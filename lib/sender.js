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
   * @param {string} account
   * @param {ChannelContract} contract
   * @param {Transport} transport
   * @param {Storage} storage
   */
  constructor (account, contract, transport, storage) {
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
   * @return {Promise<object>}
   */
  freshChannel (uri, paymentRequired, channelValue) {
    return this.contract.buildPaymentChannel(this.account, paymentRequired.receiver, channelValue).then(paymentChannel => {
      return this.existingChannel(uri, paymentRequired, paymentChannel)
    })
  }

  /**
   * Make request to +uri+ reusing an existing payment channel. Returns HTTP response.
   *
   * @param {string} uri
   * @param {PaymentRequired} paymentRequired
   * @param {PaymentChannel} paymentChannel
   * @return {Promise<object>}
   */
  existingChannel (uri, paymentRequired, paymentChannel) {
    let payment = channel.Payment.fromPaymentChannel(paymentChannel, paymentRequired.price)
    let nextPaymentChannel = channel.PaymentChannel.fromPayment(payment)
    return this.storage.channels.saveOrUpdate(nextPaymentChannel).then(() => {
      return this.transport.requestToken(paymentRequired.gateway, payment)
    }).then(token => {
      return this.transport.getWithToken(uri, token)
    })
  }

  /**
   * Determine if channel can be used.
   *
   * @param {PaymentChannel} paymentChannel
   * @param {PaymentRequired} paymentRequired
   * @return {boolean}
   */
  canUseChannel (paymentChannel, paymentRequired) {
    let isOpen = this.contract.getState(paymentChannel.channelId) === 0 // FIXME Harmonize channel states
    log.debug(`canUseChannel: isOpen: ${isOpen}`)
    let funded = paymentChannel.value > (paymentChannel.spent + paymentRequired.price)
    log.debug(`canUseChannel: funded: ${funded}`)
    return isOpen && funded
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
      let openChannels = _.filter(paymentChannels, paymentChannel => {
        return this.canUseChannel(paymentChannel, paymentRequired)
      })

      if (openChannels.length > 1) {
        throw new Error(`Found more than one channel from ${this.account} to ${paymentRequired.receiver}`)
      } else {
        return _.head(openChannels)
      }
    })
  }

  /**
   * Select handler based on version returned by server.
   * @param uri
   * @param preFlightResponse
   * @param callback
   */
  handlePaymentRequired (uri, preFlightResponse) {
    log.verbose('Handling 402 Payment Required response')
    return this.extractPaymentRequired(preFlightResponse).then(paymentRequired => {
      return this.findOpenChannel(paymentRequired).then(paymentChannel => {
        if (paymentChannel) {
          return this.existingChannel(uri, paymentRequired, paymentChannel)
        } else {
          let value = paymentRequired.price * 10 // FIXME Total value of the channel
          return this.freshChannel(uri, paymentRequired, value) // Build new channel
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
   * @param {string} uri
   * @return {Promise<object>}
   */
  buy (uri) {
    return this.transport.get(uri).then(response => {
      switch (response.statusCode) {
        case transport.STATUS_CODES.PAYMENT_REQUIRED:
          return this.handlePaymentRequired(uri, response)
        default:
        // Do Something
      }
    })
  }
}

/**
 * Build instance of Sender.
 *
 * @param {string} account
 * @param {ChannelContract} contract
 * @param {Transport} transport
 * @param {Storage} storage
 * @return {Sender}
 */
const build = (account, contract, transport, storage) => {
  return new Sender(account, contract, transport, storage)
}

module.exports = {
  build: build
}
