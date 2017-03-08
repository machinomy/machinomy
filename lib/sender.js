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

  freshChannel (uri, response, paymentRequired, value, callback) {
    let channels = this.storage.channels
    this.contract.buildPaymentChannel(this.account, paymentRequired.receiver, value, (error, paymentChannel) => {
      if (error) throw error
      let payment = channel.Payment.fromPaymentChannel(paymentChannel, paymentRequired.price)
      channels.saveOrUpdate(paymentChannel).then(() => {
        let nextPaymentChannel = channel.PaymentChannel.fromPayment(payment)
        return channels.saveOrUpdate(nextPaymentChannel)
      }).then(() => {
        return this.transport.requestToken(paymentRequired.gateway, payment)
      }).then(token => {
        return this.transport.getWithToken(uri, token)
      }).then(response => {
        callback(null, response)
      }).catch(error => {
        throw error
      })
    })
  }

  existingChannel (uri, response, paymentRequired, raw, callback) {
    let channels = this.storage.channels
    let paymentChannel = new channel.PaymentChannel(raw.sender, raw.receiver, raw.channelId, raw.value, raw.spent)
    let payment = channel.Payment.fromPaymentChannel(paymentChannel, paymentRequired.price)
    let nextPaymentChannel = channel.PaymentChannel.fromPayment(payment)
    channels.saveOrUpdate(nextPaymentChannel).then(() => {
      return this.transport.requestToken(paymentRequired.gateway, payment)
    }).then(token => {
      return this.transport.getWithToken(uri, token)
    }).then(response => {
      callback(null, response)
    }).catch(error => {
      throw error
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
          this.freshChannel(uri, response, paymentRequired, value, callback)
        } else if (openChannels.length === 1) {
          this.existingChannel(uri, response, paymentRequired, openChannels[0], callback)
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
