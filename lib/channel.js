'use strict'

const Promise = require('bluebird')
const util = require('ethereumjs-util')
const log = require('./log')
const configuration = require('./configuration')

const DAY_IN_SECONDS = 86400

/**
 * Default settlement period for a payment channel
 * @type {number}
 */
const DEFAULT_SETTLEMENT_PERIOD = 2 * DAY_IN_SECONDS

/**
 * Default duration of a payment channel.
 * @type {number}
 */
const DEFAULT_CHANNEL_TTL = 20 * DAY_IN_SECONDS

/**
 * Cost of creating a channel.
 * @type {number}
 */
const CREATE_CHANNEL_GAS = 300000

const buildPaymentChannel = (contract, sender, receiver, value, callback) => {
  log.info('Building payment channel from ' + sender + ' to ' + receiver + ', initial amount set to ' + value)
  let settlementPeriod = DEFAULT_SETTLEMENT_PERIOD
  let duration = DEFAULT_CHANNEL_TTL
  let options = {
    from: sender,
    value: value,
    gas: CREATE_CHANNEL_GAS
  }
  contract.createChannel(receiver, duration, settlementPeriod, options, () => {
    let didCreateChannelEvent = contract.DidCreateChannel({sender: sender, receiver: receiver})
    log.info('Waiting for the channel to be created on the blockchain: watching for DidCreateChannel event')
    didCreateChannelEvent.watch(function (error, result) {
      if (error) {
        callback(error)
      } else {
        let channelId = result.args.channelId
        log.info('The channel ' + channelId + ' is created')
        let paymentChannel = new PaymentChannel(sender, receiver, channelId, value, 0)
        didCreateChannelEvent.stopWatching()
        log.info('No longer watching for DidCreateChannel event')
        callback(error, paymentChannel)
      }
    })
  })
}

const ethHash = (message) => {
  let buffer = Buffer('\x19Ethereum Signed Message:\n' + message.length + message)
  return '0x' + util.sha3(buffer).toString('hex')
}

const claim = (contract, receiver, channelId, value, v, r, s, callback) => {
  let h = ethHash(channelId.toString() + value.toString())
  contract.claim(channelId, value, h, parseInt(v), r, s, {from: receiver})
  let didSettle = contract.DidSettle({channelId: channelId})
  didSettle.watch(function (error, result) {
    didSettle.stopWatching()
    if (error) {
      callback(error, null)
    } else {
      log.info('Claimed ' + result.args.payment + ' from ' + result.args.channelId)
      callback(null, result.args.payment)
    }
  })
}

const finishSettle = (contract, account, channelId, callback) => {
  contract.finishSettle(channelId, {from: account})
  log.info('Triggered Finish Settle on the contract')
  let didSettle = contract.DidSettle({channelId: channelId})
  didSettle.watch(function (error, result) {
    didSettle.stopWatching()
    log.info('Received DidSettle event for channel ' + channelId)
    if (error) {
      callback(error, null)
    } else {
      callback(null, result.args.payment)
    }
  })
}

const startSettle = (contract, account, channelId, payment, callback) => {
  contract.startSettle(channelId, payment, {from: account})
  log.info('Triggered Start Settle on the contract for channel ' + channelId + ' from ' + account)
  let didStartSettleEvent = contract.DidStartSettle({channelId: channelId, payment: payment})
  didStartSettleEvent.watch(function (error) {
    log.info('Received DidStartSettle event for channel ' + channelId)
    didStartSettleEvent.stopWatching()
    callback(error)
  })
}

const canStartSettle = (contract, account, channelId, callback) => {
  contract.canStartSettle(account, channelId, callback)
}

const getStateCallback = (contract, channelId, callback) => {
  contract.getState(channelId, callback)
}

/**
 * Wrapper for the payment channel contract.
 */
class ChannelContract {
  /**
   * @param {Web3} web3
   * @param {string} address - Address of the deployed contract.
   * @param {Object[]} abi - Interface of the deployed contract.
   */
  constructor (web3, address, abi) {
    this.contract = web3.eth.contract(abi).at(address)
  }

  /**
   * Initiate payment channel between `sender` and `receiver`, with initial amount set to `value`.
   * @param {string} sender
   * @param {string} receiver
   * @param {number} value
   */
  buildPaymentChannel (sender, receiver, value) {
    let promisified = Promise.promisify(buildPaymentChannel)
    return promisified(this.contract, sender, receiver, value)
  }

  claim (receiver, channelId, value, v, r, s) {
    let promisified = Promise.promisify(claim)
    return promisified(this.contract, receiver, channelId, value, v, r, s)
  }

  /**
   * @param {String} account
   * @param {String} channelId
   * @returns Boolean
   */
  canStartSettle (account, channelId) {
    let promisified = Promise.promisify(canStartSettle)
    return promisified(this.contract, account, channelId)
  }

  /**
   * Overcome Ethereum Signed Message passing to EVM ecrecover.
   * @param channelId
   * @param payment
   * @return {string}
   */
  h (channelId, payment) {
    let message = channelId.toString() + payment.toString()
    let buffer = Buffer('\x19Ethereum Signed Message:\n' + message.length + message)
    return '0x' + util.sha3(buffer).toString('hex')
  }

  /**
   * @param {String} channelId
   * @param {Number} payment
   * @param {Number} v
   * @param {String} r
   * @param {String} s
   */
  canClaim (channelId, payment, v, r, s) {
    let h = this.h(channelId, payment)
    return this.contract.canClaim(channelId, h, v, r, s)
  }

  /**
   * @param {String} sender
   * @param {String} channelId
   */
  canFinishSettle (sender, channelId) {
    return this.contract.canFinishSettle(sender, channelId)
  }

  /**
   * @param {string} channelId
   * @return {Promise<number>}
   */
  getState (channelId) {
    if (process.env.NODE_ENV === 'test') { // FIXME
      return Promise.resolve(0)
    } else {
      let promisified = Promise.promisify(getStateCallback)
      return promisified(this.contract, channelId).then(state => {
        return Number(state)
      })
    }
  }

  getUntil (channelId) {
    return this.contract.getUntil(channelId)
  }

  startSettle (account, channelId, payment) {
    let promisified = Promise.promisify(startSettle)
    return promisified(this.contract, account, channelId, payment)
  }

  finishSettle (account, channelId) {
    let promisified = Promise.promisify(finishSettle)
    return promisified(this.contract, account, channelId)
  }
}

const sign = (web3, account, messageHex, callback) => {
  web3.eth.sign(account, messageHex, (error, signature) => {
    let result = util.fromRpcSig(signature)
    callback(error, result)
  })
}

const personalSign = (web3, account, messageHex, callback) => {
  let message = Buffer.from(messageHex.replace('0x', ''), 'hex')
  let sha3 = ethHash(message)
  web3.eth.sign(account, sha3, (error, signature) => {
    let result = util.fromRpcSig(signature)
    callback(error, result)
  })
}

/**
 * The Payment Channel
 */
class PaymentChannel {

  /**
   * @param {String} sender - Ethereum address of the client.
   * @param {String} receiver - Ethereum address of the server.
   * @param {String} channelId - Identifier of the channel.
   * @param {Number} value - Total value of the channel.
   * @param {Number} spent - Value sent by {sender} to {receiver}.
   * @param {Number} state - 'open', 'settling', 'settled'
   */
  constructor (sender, receiver, channelId, value, spent, state = 0) { // FIXME remove contract parameter
    this.sender = sender
    this.receiver = receiver
    this.channelId = channelId
    this.value = value
    this.spent = spent
    this.state = state || 0
  }

  /**
   * Sign value transfer.
   * @param {Web3} web3
   * @param {number} value - Transferred value.
   * @returns {Promise<{r: string, s: string, v: string}>}
   */
  sign (web3, value) {
    let message = this.channelId + value.toString()
    let messageHex = '0x' + Buffer.from(message).toString('hex')
    let promisified = null// Promise.promisify(sign)

    let isOnNodeJs = false
    if (typeof BROWSER === 'undefined') {
      isOnNodeJs = true
    }

    if (isOnNodeJs) {
      promisified = Promise.promisify(sign)
    } else {
      promisified = Promise.promisify(personalSign)
    }

    return promisified(web3, this.sender, messageHex).then(sig => {
      return {
        r: '0x' + sig.r.toString('hex'),
        s: '0x' + sig.s.toString('hex'),
        v: sig.v
      }
    })
  }
}

/**
 * @param {Payment} payment
 * @returns {PaymentChannel}
 */
PaymentChannel.fromPayment = (payment) => {
  return new PaymentChannel(payment.sender, payment.receiver, payment.channelId, payment.channelValue, payment.value)
}

/**
 * @param {object} document
 * @return {PaymentChannel}
 */
PaymentChannel.fromDocument = (document) => {
  return new PaymentChannel(
    document.sender,
    document.receiver,
    document.channelId,
    document.value,
    document.spent,
    document.state
  )
}

class Payment {
  /**
   * @param {Object} options
   */
  constructor (options) {
    this.channelId = options.channelId
    this.sender = options.sender
    this.receiver = options.receiver
    this.price = options.price
    this.value = options.value
    this.channelValue = options.channelValue
    this.v = Number(options.v)
    this.r = options.r
    this.s = options.s
  }
}

/**
 * Build {Payment} based on PaymentChannel and monetary value to send.
 *
 * @param {Web3} web3
 * @param {PaymentChannel} paymentChannel
 * @param {number} price
 * @returns {Promise<Payment>}
 */
Payment.fromPaymentChannel = (web3, paymentChannel, price) => {
  let value = price + paymentChannel.spent
  return paymentChannel.sign(web3, value).then(signature => {
    return new Payment({
      channelId: paymentChannel.channelId,
      sender: paymentChannel.sender,
      receiver: paymentChannel.receiver,
      price: price,
      value: value,
      channelValue: paymentChannel.value,
      v: signature.v,
      r: signature.r,
      s: signature.s
    })
  })
}

class ChannelId {
  /**
   * @param {Buffer} buffer
   */
  constructor (buffer) {
    this.id = buffer
  }

  toString () {
    return '0x' + this.id.toString('hex')
  }
}

/**
 * @param {string|Buffer|ChannelId} something
 * @return {ChannelId}
 */
const id = (something) => {
  let result
  if (typeof something === 'string') {
    let noPrefix = something.replace('0x', '')
    let buffer = Buffer.from(noPrefix, 'HEX')
    result = new ChannelId(buffer)
  } else if (something instanceof Buffer) {
    result = new ChannelId(something)
  } else if (something instanceof ChannelId) {
    result = something
  }
  return result
}

/**
 * @param {Web3} web3
 * @return {ChannelContract}
 */
const contract = (web3) => {
  let address = configuration.contractAddress()
  return new ChannelContract(web3, address, configuration.CONTRACT_INTERFACE)
}

module.exports = {
  contract: contract,
  Payment: Payment,
  PaymentChannel: PaymentChannel,
  ChannelId: ChannelId,
  id: id
}
