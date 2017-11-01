import { Log } from 'typescript-logger'
import Web3 = require('web3')

import * as channel from './channel'
import { PaymentChannel } from './channel'
import Storage from './storage'
import Payment from './Payment'

const log = Log.create('sender')
const isPaymentValid = (payment: Payment, paymentChannel: PaymentChannel): boolean => {
  let validIncrement = (paymentChannel.spent.plus(payment.price)).lessThanOrEqualTo(paymentChannel.value)
  let validChannelValue = paymentChannel.value.equals(payment.channelValue)
  let validPaymentValue = paymentChannel.value.lessThanOrEqualTo(payment.channelValue)
  return validIncrement && validChannelValue && validPaymentValue
}

export class Receiver {
  web3: Web3
  account: string
  storage: Storage

  constructor (web3: Web3, account: string, storage: Storage) {
    this.web3 = web3
    this.account = account
    this.storage = storage
  }

    /**
     * Find a payment channel corresponding to +payment+.
     */
  findPaymentChannel (payment: Payment): Promise<PaymentChannel|null> {
    let query = {sender: payment.sender, receiver: payment.receiver, channelId: payment.channelId}
    return this.storage.channels.allByQuery(query).then(documents => {
      if (documents.length >= 1) {
        let document = documents[0]
        return channel.PaymentChannel.fromDocument(document)
      } else {
        return null
      }
    })
  }

    /**
     * Accept or reject payment.
     *
     * @param {Payment} payment
     * @return {Promise<string>}
     */
  acceptPayment (payment: Payment): Promise<string> {
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
  whenValidPayment (payment: Payment): Promise<string> {
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
     */
  whenInvalidPayment (payment: Payment, paymentChannel: PaymentChannel): Promise<string> {
    log.error(`Invalid payment. Closing the channel ${paymentChannel.channelId}`)
    return this.storage.payments.firstMaximum(paymentChannel.channelId).then(payment => {
      if (payment) {
        // return channel.contract(this.web3).claim(this.account, payment.channelId, payment.value, payment.v, payment.r, payment.s).then(claimedValue => {
        //   return Promise.reject(new Error(`Claimed ${claimedValue} from channel ${payment.channelId} after invalid payment`))
        // })
        return Promise.reject(new Error('Do not claim money on non-existent channel'))
      } else {
        return Promise.reject(new Error('Do not claim money on non-existent channel'))
      }
    })
  }

    /**
     * Check if token is valid, and can be accepted.
     */
  acceptToken (token: string): Promise<boolean> {
    return this.storage.tokens.isPresent(token)
  }

  ensureCanAcceptPayment (payment: Payment) {
    if (payment.receiver !== this.account) {
      throw new Error(`Receiver must be ${this.account}`)
    }
  }
}

/**
 * Build receiver side of a payment channel.
 */
export const build = (web3: Web3, account: string, storage: Storage): Receiver => {
  return new Receiver(web3, account, storage)
}
