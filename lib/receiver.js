'use strict'

const channel = require('./channel')
const log = require('./log')

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

class Receiver {
  /**
   * @param {string} account
   * @param {Storage} storage
   */
  constructor (account, storage) {
    this.account = account
    this.storage = storage
  }

  /**
   * Find a payment channel corresponding to +payment+.
   * @param {Payment} payment
   * @returns {Promise<PaymentChannel>}
   */
  findPaymentChannel (payment) {
    let query = {sender: payment.sender, receiver: payment.receiver, channelId: payment.channelId}
    return this.storage.channels.allByQuery(query).then(documents => {
      if (documents.length > 1) {
        throw new Error(`More than one channel found for payment`, payment)
      } else {
        return documents[0]
      }
    })
  }

  /**
   * Accept or reject payment.
   *
   * @param {Payment} payment
   * @param {function} callback
   */
  acceptPayment (payment, callback) {
    var self = this

    if (payment.receiver !== self.account) {
      throw new Error(`Receiver must be ${self.account}`)
    }

    let channels = self.storage.channels
    let tokens = self.storage.tokens
    let payments = self.storage.payments

    this.findPaymentChannel(payment).then(doc => {
      if (doc) {
        let paymentChannel = new channel.PaymentChannel(doc.sender, doc.receiver, doc.channelId, null, doc.value, doc.spent)
        if (isPaymentValid(payment, paymentChannel)) {
          let token = channel.web3.sha3(JSON.stringify(payment))
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
            channel.contract.claim(self.account, paymentDoc.channelId, paymentDoc.value, paymentDoc.v, paymentDoc.r, paymentDoc.s, function (error, claimedValue) {
              if (error) throw error
              log.info(`Claimed ${claimedValue} from channel ${paymentDoc.channelId}`)
            })
          }).catch(error => {
            callback(error, null)
          })
        }
      } else {
        let token = channel.web3.sha3(JSON.stringify(payment))
        let paymentChannel = channel.PaymentChannel.fromPayment(payment)
        channels.saveOrUpdate(paymentChannel).then(() => {
          return tokens.save(token, payment.channelId)
        }).then(() => {
          return payments.save(token, payment)
        }).then(() => {
          callback(null, token)
        }).catch(error => {
          callback(error, null)
        })
      }
    })
  }

  acceptToken (token, callback) {
    let tokens = this.storage.tokens
    tokens.isPresent(token).then(isPresent => {
      callback(isPresent)
    }).catch(error => {
      throw error
    })
  }
}

/**
 * Build receiver side of a payment channel.
 *
 * @param {string} account - Ethereum account of the receiver.
 * @param {Storage} storage
 * @returns {Receiver}
 */
const build = (account, storage) => {
  return new Receiver(account, storage)
}

module.exports = {
  build: build
}
