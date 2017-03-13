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
   * @param {Web3} web3
   * @param {string} account
   * @param {Storage} storage
   */
  constructor (web3, account, storage) {
    this.web3 = web3
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
      } else if (documents.length === 1) {
        let document = documents[0]
        return channel.PaymentChannel.fromDocument(document)
      }
    })
  }

  /**
   * Accept or reject payment.
   *
   * @param {Payment} payment
   * @return {Promise<string>}
   */
  acceptPayment (payment) {
    this.ensureCanAcceptPayment(payment)

    return this.findPaymentChannel(payment).then(paymentChannel => {
      if (paymentChannel && !isPaymentValid(payment, paymentChannel)) {
        return this.whenInvalidPayment(payment, paymentChannel)
      } else {
        return this.whenValidPayment(payment)
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
    let token = this.web3.sha3(JSON.stringify(payment)).toString()
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
   * Close the channel after receiving invalid payment.
   *
   * @param {Payment} payment
   * @param {PaymentChannel} paymentChannel
   * @return {Promise}
   */
  whenInvalidPayment (payment, paymentChannel) {
    log.error(`Invalid payment. Closing the channel ${paymentChannel.channelId}`)
    return this.storage.payments.firstMaximum(paymentChannel.channelId).then(payment => {
      channel.contract(this.web3).claim(this.account, payment.channelId, payment.value, payment.v, payment.r, payment.s).then(claimedValue => {
        log.info(`Claimed ${claimedValue} from channel ${payment.channelId}`)
      }).catch(error => {
        throw error
      })
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
 * @param {Web3} web3
 * @param {string} account - Ethereum account of the receiver.
 * @param {Storage} storage
 * @returns {Receiver}
 */
const build = (web3, account, storage) => {
  return new Receiver(web3, account, storage)
}

module.exports = {
  build: build
}
