'use strict'

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
   * Make request to +uri+ after building a new payment channel. Returns HTTP response.
   *
   * @param {string} uri
   * @param {PaymentRequired} paymentRequired
   * @param {number} channelValue
   * @return {Promise<object>}
   */
  freshChannel (uri, paymentRequired, channelValue) {
    return this.contract._buildPaymentChannel(this.account, paymentRequired.receiver, channelValue).then(paymentChannel => {
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

  canUseChannel (paymentChannel, paymentRequired) {
    let isOpen = this.contract.getState(paymentChannel.channelId) === 0
    let funded = paymentChannel.value > (paymentChannel.spent + paymentRequired.price)
    return isOpen && funded
  }

  /**
   * Select handler based on version returned by server.
   * @param uri
   * @param response
   * @param callback
   */
  handlePaymentRequired (uri, response, callback) {
    log.verbose('Handling 402 Payment Required response')
    let version = response.headers['paywall-version']
    if (version === VERSION) {
      let paymentRequired = transport.PaymentRequired.parse(response.headers)
      this.storage.channels.allByQuery({sender: this.account, receiver: paymentRequired.receiver}).then(docs => {
        let openChannels = []
        for (let doc of docs) {
          if (this.canUseChannel(doc, paymentRequired)) {
            openChannels.push(doc)
          }
        }
        if (openChannels.length === 0) {
          // Build new channel
          let value = paymentRequired.price * 10 // FIXME Total value of the channel
          this.freshChannel(uri, paymentRequired, value).then(response => {
            callback(null, response)
          }).catch(error => {
            callback(error, null)
          })
        } else if (openChannels.length === 1) {
          this.existingChannel(uri, paymentRequired, openChannels[0]).then(response => {
            callback(null, response)
          }).catch(error => {
            callback(error, null)
          })
        } else {
          // Do Something
          throw new Error(`Found more than one channel from ${this.account} to ${paymentRequired.receiver}`)
        }
      })
    } else {
      // Do Something
      callback(`Unsupported version ${version}, expected ${VERSION}`, null)
    }
  }

  pry (uri, callback) {
    this.transport.get(uri).then(response => {
      switch (response.statusCode) {
        case 402:
          let version = response.headers['paywall-version']
          if (version === VERSION) {
            let paymentRequired = transport.PaymentRequired.parse(response.headers)
            callback(null, paymentRequired)
          } else {
            callback(`Unsupported version ${version}, expected ${VERSION}`, null)
          }
          break
        default:
          callback('No payment required', null)
      }
    }).catch(error => {
      callback(error)
    })
  }

  buy (uri, callback) {
    this.transport.get(uri).then(response => {
      switch (response.statusCode) {
        case 402:
          this.handlePaymentRequired(uri, response, callback)
          break
        default:
        // Do Something
      }
    }).catch(error => {
      callback(error)
    })
  }
}

const build = (account, contract, transport, storage) => {
  return new Sender(account, contract, transport, storage)
}

module.exports = {
  build: build
}
