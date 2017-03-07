'use strict'

const Web3 = require('web3')
const util = require('ethereumjs-util')
const log = require('./log')
const configuration = require('./configuration')

var web3 = new Web3()
web3.setProvider(new Web3.providers.HttpProvider('http://localhost:8545'))

var CONTRACT_ADDRESS = configuration.contractAddress()
var CONTRACT_INTERFACE = configuration.contractInterface()

/**
 * Wrapper for the payment channel contract.
 *
 * @param {string} address - Address of the deployed contract.
 * @param {Object[]} abi - Interface of the deployed contract.
 * @constructor
 */
var ChannelContract = function (address, abi) {
  this.contract = web3.eth.contract(abi).at(address)
}

ChannelContract.prototype.getHash = function (channelId, value) {
  return web3.sha3(channelId + value.toString())
}

var CONTRACT = new ChannelContract(CONTRACT_ADDRESS, CONTRACT_INTERFACE)

/**
 * Cost of creating a channel.
 * @type {number}
 */
ChannelContract.CREATE_CHANNEL_GAS = 300000

var DAY_IN_SECONDS = 86400

/**
 * FIXME Settlement period for the contract.
 * @type {number}
 */
ChannelContract.SETTLEMENT_PERIOD = 2 * DAY_IN_SECONDS

/**
 * @type {number}
 */
ChannelContract.DURATION = 2 * DAY_IN_SECONDS

/**
 * Initiate payment channel between `sender` and `receiver`, with initial amount set to `value`.
 * @param sender
 * @param receiver
 * @param value
 * @param callback
 */
ChannelContract.prototype.buildPaymentChannel = function (sender, receiver, value, callback) {
  var self = this
  log.verbose('Building payment channel from ' + sender + ' to ' + receiver + ', initial amount set to ' + value)
  var settlementPeriod = ChannelContract.SETTLEMENT_PERIOD
  var duration = ChannelContract.DURATION
  var options = {
    from: sender,
    value: value,
    gas: ChannelContract.CREATE_CHANNEL_GAS
  }
  this.contract.createChannel(receiver, duration, settlementPeriod, options)
  var didCreateChannelEvent = this.contract.DidCreateChannel({sender: sender, receiver: receiver})
  log.info('Waiting for the channel to be created on the blockchain: watching for DidCreateChannel event')
  didCreateChannelEvent.watch(function (error, result) {
    var channelId = result.args.channelId
    log.verbose('The channel ' + channelId + ' is created')
    var paymentChannel = new PaymentChannel(sender, receiver, channelId, self, value, 0)
    didCreateChannelEvent.stopWatching()
    log.verbose('No longer watching for DidCreateChannel event')
    callback(error, paymentChannel)
  })
}

ChannelContract.prototype.claim = function (receiver, channelId, value, v, r, s, callback) {
  let h = this.h(channelId, value)
  this.contract.claim(channelId, value, h, parseInt(v), r, s, {from: receiver})
  var didSettle = this.contract.DidSettle({channelId: channelId})
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

/**
 * @param {String} account
 * @param {String} channelId
 * @returns Boolean
 */
ChannelContract.prototype.canStartSettle = function (account, channelId) {
  return this.contract.canStartSettle(account, channelId)
}

/**
 * Overcome Ethereum Signed Message passing to EVM ecrecover.
 * @param channelId
 * @param payment
 * @return {string}
 */
ChannelContract.prototype.h = function (channelId, payment) {
  let message = channelId.toString() + payment.toString()
  let buffer = Buffer('\x19Ethereum Signed Message:\n' + message.length + message)
  return '0x' + util.sha3(buffer).toString('HEX')
}

/**
 * @param {String} channelId
 * @param {Number} payment
 * @param {Number} v
 * @param {String} r
 * @param {String} s
 */
ChannelContract.prototype.canClaim = function (channelId, payment, v, r, s) {
  let h = this.h(channelId, payment)
  return this.contract.canClaim(channelId, h, v, r, s)
}

/**
 * @param {String} sender
 * @param {String} channelId
 */
ChannelContract.prototype.canFinishSettle = function (sender, channelId) {
  return this.contract.canFinishSettle(sender, channelId)
}

ChannelContract.prototype.getState = function (channelId) {
  return Number(this.contract.getState(channelId))
}

ChannelContract.prototype.getUntil = function (channelId) {
  return this.contract.getUntil(channelId)
}

ChannelContract.prototype.startSettle = function (account, channelId, payment, callback) {
  var self = this
  self.contract.startSettle(channelId, payment, {from: account})
  log.verbose('Triggered Start Settle on the contract for channel ' + channelId + ' from ' + account)
  var didStartSettleEvent = self.contract.DidStartSettle({channelId: channelId, payment: payment})
  didStartSettleEvent.watch(function (error) {
    log.verbose('Received DidStartSettle event for channel ' + channelId)
    didStartSettleEvent.stopWatching()
    callback(error)
  })
}

ChannelContract.prototype.finishSettle = function (account, channelId, callback) {
  var self = this
  self.contract.finishSettle(channelId, {from: account})
  log.verbose('Triggered Finish Settle on the contract')
  var didSettle = this.contract.DidSettle({channelId: channelId})
  didSettle.watch(function (error, result) {
    didSettle.stopWatching()
    log.verbose('Received DidSettle event for channel ' + channelId)
    if (error) {
      callback(error, null)
    } else {
      callback(null, result.args.payment)
    }
  })
}

/**
 * The Payment Channel
 * @param {String} sender - Ethereum address of the client.
 * @param {String} receiver - Ethereum address of the server.
 * @param {String} channelId - Identifier of the channel.
 * @param {ChannelContract} contract - Payment channel contract.
 * @param {Number} value - Total value of the channel.
 * @param {Number} spent - Value sent by {sender} to {receiver}.
 * @param {Number} state - 'open', 'settling', 'settled'
 * @constructor
 */
var PaymentChannel = function (sender, receiver, channelId, contract, value, spent, state = 0) { // FIXME remove contract parameter
  this.sender = sender
  this.receiver = receiver
  this.channelId = channelId
  this.value = value
  this.spent = spent
  this.state = state || 0
}

/**
 * Sign value transfer.
 * @param {number} value - Transferred value.
 * @returns {{r: string, s: string, v: string}}
 */
PaymentChannel.prototype.sign = function (value) {
  let message = this.channelId + value.toString()
  let messageHex = '0x' + Buffer.from(message).toString('HEX')
  let sig = util.fromRpcSig(web3.eth.sign(this.sender, messageHex))

  return {
    r: '0x' + sig.r.toString('HEX'),
    s: '0x' + sig.s.toString('HEX'),
    v: sig.v
  }
}

/**
 *
 * @param {Payment} payment
 * @returns {PaymentChannel}
 */
PaymentChannel.fromPayment = function (payment) {
  return new PaymentChannel(payment.sender, payment.receiver, payment.channelId, null, payment.channelValue, payment.value)
}

/**
 * @param {object} document
 * @return {PaymentChannel}
 */
PaymentChannel.fromDocument = function (document) {
  return new PaymentChannel(
    document.sender,
    document.receiver,
    document.channelId,
    document.contract,
    document.value,
    document.spent,
    document.state
  )
}

/**
 * @param {Object} options
 * @constructor
 */
var Payment = function (options) {
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

/**
 * Build {Payment} based on PaymentChannel and monetary value to send.
 *
 * @param {PaymentChannel} paymentChannel
 * @param {number} price
 * @returns {Payment}
 */
Payment.fromPaymentChannel = (paymentChannel, price) => {
  let value = price + paymentChannel.spent
  let signature = paymentChannel.sign(value)
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

module.exports = {
  web3: web3,
  contract: CONTRACT,
  Payment: Payment,
  PaymentChannel: PaymentChannel,
  ChannelId: ChannelId,
  id: id
}
