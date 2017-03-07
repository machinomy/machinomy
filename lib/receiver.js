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
    this.ensureCanAcceptPayment(payment)

    var self = this

    let payments = self.storage.payments

    this.findPaymentChannel(payment).then(doc => {
      if (doc) {
        let paymentChannel = new channel.PaymentChannel(doc.sender, doc.receiver, doc.channelId, null, doc.value, doc.spent)
        if (isPaymentValid(payment, paymentChannel)) {
          this.whenValidPayment(payment).then(token => {
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
        this.whenValidPayment(payment).then(token => {
          callback(null, token)
        }).catch(error => {
          callback(error, null)
        })
      }
    })
  }

  /**
   * Return new valid toke after all the ancillary savings.
   *
   * @param {Payment} payment
   * @return {Promise<String>}
   */
  whenValidPayment (payment) {
    let token = channel.web3.sha3(JSON.stringify(payment)).toString()
    let paymentChannel = channel.PaymentChannel.fromPayment(payment)
    return this.storage.channels.saveOrUpdate(paymentChannel).then(() => {
      return this.storage.tokens.save(token, payment.channelId)
    }).then(() => {
      return this.storage.payments.save(token, payment)
    }).then(() => {
      return token
    })
  }

  /**
   * Check if token is valid, and can be accepted.
   *
   * @param {string} token
   * @return {Promise<boolean>}
   */
  acceptToken (token) {
    return this.storage.tokens.isPresent(token)
  }

  /**
   * @param {Payment} payment
   */
  ensureCanAcceptPayment (payment) {
    if (payment.receiver !== this.account) {
      throw new Error(`Receiver must be ${this.account}`)
    }
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
