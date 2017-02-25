'use strict'

const Datastore = require('nedb')
const channel = require('./channel')
const log = require('./log')
const Promise = require('bluebird')
const _ = require('lodash')

/**
 * @param {string} path
 * @param {string} namespace
 * @constructor
 */
var Storage = function (path, namespace) {
  let _engine = engine(path)
  this.namespace = namespace
  this.db = _engine.datastore
  this._channels = channels(_engine, namespace)
  this._tokens = tokens(_engine, namespace)
  this._payments = payments(_engine, namespace)
}

/**
 * @param {Engine} engine
 * @param {string|null} namespace
 * @return {PaymentsDatabase}
 */
const payments = (engine, namespace = null) => {
  return new PaymentsDatabase(engine, namespace)
}

/**
 * Database layer for payments.
 */
class PaymentsDatabase {
  /**
   * @param {Engine} engine
   * @param {string|null} namespace
   */
  constructor (engine, namespace) {
    this.kind = namespaced(namespace, 'payment')
    this.engine = engine
  }

  /**
   * Save payment to the database, to check later.
   * @param {string} token
   * @param {Payment} payment
   * @return {Promise}
   */
  save (token, payment) {
    let document = {
      kind: this.kind,
      token: token,
      channelId: payment.channelId,
      value: payment.value,
      v: Number(payment.v),
      r: payment.r,
      s: payment.s
    }
    log.verbose(`Saving payment for channel ${payment.channelId} and token ${token}`)
    return this.engine.insert(document)
  }

  /**
   * Find a payment with maximum value on it inside the channel.
   *
   * @param {ChannelId} channelId
   * @returns {Promise<Payment>}
   */
  firstMaximum (channelId) {
    log.verbose(`Trying to find last payment for channel ${channelId.toString()}`)
    let query = { kind: this.kind, channelId: channelId.toString() }
    return this.engine.find(query).then(documents => {
      log.verbose(`Found ${documents.length} payment documents`)
      let maximum = _.maxBy(documents, payment => { return payment.value })
      log.verbose(`Found maximum payment for channel ${channelId}`, maximum)
      return maximum
    })
  }
}

/**
 * @param {Engine} engine
 * @param {string|null} namespace
 * @return {TokensDatabase}
 */
const tokens = (engine, namespace = null) => {
  return new TokensDatabase(engine, namespace)
}

/**
 * Database layer for tokens.
 */
class TokensDatabase {
  /**
   * @param {Engine} engine
   * @param {string|null} namespace
   */
  constructor (engine, namespace = null) {
    this.kind = namespaced(namespace, 'token')
    this.engine = engine
  }

  /**
   * Save token for channelId
   * @param {string} token
   * @param {ChannelId} channelId
   * @return {Promise}
   */
  save (token, channelId) {
    let tokenDocument = {
      kind: this.kind,
      token: token.toString(),
      channelId: channelId.toString()
    }
    return this.engine.insert(tokenDocument)
  }

  /**
   * Check if token is stored.
   *
   * @param {string} token
   * @return {Promise<boolean>}
   */
  isPresent (token) {
    let query = { kind: this.kind, token: token }
    return this.engine.findOne(query).then(document => {
      let result = Boolean(document)
      log.verbose(`Token ${token} is present: ${result}`)
      return result
    })
  }
}

/**
 * @param {Engine} engine
 * @param {string|null} namespace
 * @return {ChannelsDatabase}
 */
const channels = (engine, namespace = null) => {
  return new ChannelsDatabase(engine, namespace)
}

/**
 * Database layer for {PaymentChannel}
 */
class ChannelsDatabase {

  /**
   * @param {Engine} engine
   * @param {string|null} namespace
   */
  constructor (engine, namespace) {
    this.kind = namespaced(namespace, 'channel')
    this.engine = engine
  }

  /**
   * @param {PaymentChannel} paymentChannel
   * @return {Promise}
   */
  save (paymentChannel) {
    let document = {
      kind: this.kind,
      sender: paymentChannel.sender,
      receiver: paymentChannel.receiver,
      value: paymentChannel.value,
      spent: paymentChannel.spent,
      channelId: paymentChannel.channelId
    }
    return this.engine.insert(document)
  }

  /**
   * @param {PaymentChannel} paymentChannel
   * @return {Promise}
   */
  saveOrUpdate (paymentChannel) {
    return this.firstById(paymentChannel.channelId).then(found => {
      let result = null
      if (found) {
        result = this.spend(paymentChannel.channelId, paymentChannel.spent)
      } else {
        result = this.save(paymentChannel)
      }
      return result
    })
  }

  /**
   * @param {ChannelId} channelId
   * @return {Promise<PaymentChannel>}
   */
  firstById (channelId) {
    let query = {
      kind: this.kind,
      channelId: channelId.toString()
    }
    log.verbose(`ChannelsDatabase#findById Trying to find channel by id ${channelId.toString()}`)
    return this.engine.findOne(query).then(document => {
      let result = null
      if (document) {
        log.verbose(`ChannelsDatabase#findById Found document`, document)
        let state = channel.contract.getState(channelId.toString()) // FIXME
        result = new channel.PaymentChannel(document.sender, document.receiver, document.channelId, null, document.value, document.spent, state)
      } else {
        log.verbose(`ChannelsDatabase#findById Could not find document by id ${channelId.toString()}`)
      }
      return result
    })
  }

  /**
   * Set amount of money spent on the channel.
   *
   * @param {ChannelId} channelId
   * @param spent
   * @return {*}
   */
  spend (channelId, spent) {
    let query = {
      kind: this.kind,
      channelId: channelId.toString()
    }
    let update = {
      $set: {
        spent: spent
      }
    }
    log.verbose(`ChannelsDatabase#spend channel ${channelId.toString()} spent ${spent}`)
    return this.engine.update(query, update)
  }

  /**
   * Retrieve all the payment channels stored.
   *
   * @return {Promise<PaymentChannel>}
   */
  all () {
    return this.allByQuery({})
  }

  /**
   * Find all channels by query, for example, by sender and receiver.
   * @param {object} q
   * @return {Promise<PaymentChannel>}
   */
  allByQuery (q) {
    let query = Object.assign({kind: this.kind}, q)
    log.verbose('ChannelsDatabase#allByQuery', query)
    return this.engine.find(query).then(found => {
      log.verbose(`ChannelsDatabase#allByQuery found ${found.length} documents`)
      return _.map(found, doc => {
        let state = channel.contract.getState(doc.channelId.toString()) // FIXME
        return new channel.PaymentChannel(doc.sender, doc.receiver, doc.channelId, doc.contract, doc.value, doc.spent, state)
      })
    })
  }
}

/**
 * Instantiate a storage engine.
 *
 * @param {string} path
 * @param {boolean|null} inMemoryOnly
 * @return {Engine}
 */
const engine = (path, inMemoryOnly = false) => {
  return new Engine(path, inMemoryOnly)
}

/**
 * Database engine.
 *
 * @param {string} path
 * @param {boolean|null} inMemoryOnly
 * @constructor
 */
class Engine {
  constructor (path, inMemoryOnly) {
    // noinspection JSCheckFunctionSignatures
    this.datastore = new Datastore({ filename: path, autoload: true, inMemoryOnly: inMemoryOnly })
    this._find = Promise.promisify(this.datastore.find, { context: this.datastore })
    this._findOne = Promise.promisify(this.datastore.findOne, { context: this.datastore })
    this._insert = Promise.promisify(this.datastore.insert, { context: this.datastore })
    this._update = Promise.promisify(this.datastore.update, { context: this.datastore })
  }

  find (query) {
    return this._find(query)
  }

  findOne (query) {
    return this._findOne(query)
  }

  insert (document) {
    return this._insert(document)
  }

  update (query, update) {
    return this._update(query, update, {})
  }
}

/**
 * @param {string|null} namespace
 * @param {string} kind
 * @return {string}
 */
const namespaced = (namespace, kind) => {
  let result = kind
  if (namespace) {
    result = namespace + ':' + kind
  }
  return result
}

module.exports = {
  Storage: Storage,
  channels: channels,
  engine: engine,
  tokens: tokens,
  payments: payments
}
