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
}

/**
 * Find channels by sender and receiver accounts.
 * @param {string} sender - Ethereum account of the sender.
 * @param {string} receiver - Ethereum account of the receiver.
 * @param {function} callback
 */
Storage.prototype.channelsBySenderReceiver = function (sender, receiver, callback) {
  var query = {
    kind: this.ns('channel'),
    sender: sender,
    receiver: receiver
  }
  this.db.find(query, callback)
}

/**
 * Find channels by sender, receiver accounts, and channel id.
 * @param {string} sender - Ethereum account of the sender.
 * @param {string} receiver - Ethereum account of the receiver.
 * @param {string} channelId - Identifier of the channel to find.
 * @param {function} callback
 */
Storage.prototype.channelsBySenderReceiverChannelId = function (sender, receiver, channelId, callback) {
  var query = {
    kind: this.ns('channel'),
    sender: sender,
    receiver: receiver,
    channelId: channelId
  }
  this.db.find(query, callback)
}

Storage.prototype.channelByChannelId = function (channelId, callback) {
  var query = {
    kind: this.ns('channel'),
    channelId: channelId
  }
  this.db.findOne(query, function (err, doc) {
    if (err) {
      callback(err, null)
    } else {
      var state = channel.contract.getState(channelId)
      var paymentChannel = new channel.PaymentChannel(doc.sender, doc.receiver, doc.channelId, null, doc.value, doc.spent, state)
      callback(null, paymentChannel)
    }
  })
}

/**
 * Save token to the database, to check against later.
 * @param {string} token
 * @param {Payment} payment
 * @param {function(string|null)} callback
 */
Storage.prototype.saveToken = function (token, payment, callback) {
  var self = this
  var tokenDoc = {
    kind: this.ns('token'),
    token: token,
    channelId: payment.channelId
  }
  var paymentDoc = {
    kind: this.ns('payment'),
    token: token,
    channelId: payment.channelId,
    value: payment.value,
    v: Number(payment.v),
    r: payment.r,
    s: payment.s
  }
  self.db.insert(tokenDoc, function (err, _) {
    if (err) {
      callback(err)
    } else {
      self.db.insert(paymentDoc, function (err, _) {
        if (err) {
          callback(err)
        } else {
          callback(null)
        }
      })
    }
  })
}

Storage.prototype.lastPaymentDoc = function (channelId, callback) {
  var self = this
  var query = { kind: this.ns('payment'), channelId: channelId }
  log.verbose('Trying to find last payment for channelId ' + channelId)
  self.db.find(query, function (err, documents) {
    if (err) {
      callback(err, null)
    } else {
      log.verbose('Found ' + documents.length + ' payment documents')
      if (documents.length > 0) {
        var maxPaymentDoc = documents.reduce(function (a, b) {
          if (a.value >= b.value) {
            return a
          } else {
            return b
          }
        })
        log.verbose('Found a maximum payment: ' + maxPaymentDoc.value, maxPaymentDoc)
        callback(null, maxPaymentDoc)
      } else {
        callback('Can not find payment for channel ' + channelId, null)
      }
    }
  })
}

/**
 * Check if token is valid. Valid token is (1) present, (2) issued earlier.
 * @param {string} token
 * @param {function(string|null, boolean|null)} callback
 */
Storage.prototype.checkToken = function (token, callback) {
  var query = {
    kind: this.ns('token'),
    token: token
  }
  this.db.findOne(query, function (error, tokenDoc) {
    if (error) {
      callback(error, null)
    } else if (tokenDoc) {
      log.verbose('Found a token document for token ' + token)
      callback(null, true)
    } else {
      log.verbose('Can not find a token document for token' + token)
      callback(null, false)
    }
  })
}

/**
 * @param {PaymentChannel} paymentChannel
 * @param {function(string|null)} callback
 */
Storage.prototype.saveChannel = function (paymentChannel, callback) {
  this._channels.saveOrUpdate(paymentChannel).then(() => {
    callback(null)
  }).catch(error => {
    callback(error)
  })
}

/**
 * @param {string} raw
 * @returns {string}
 */
Storage.prototype.ns = function (raw) {
  if (this.namespace) {
    return this.namespace + ':' + raw
  } else {
    return raw
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
    return this.engine.findOne(query).then(document => {
      let result = null
      if (document) {
        // FIXME let state = channel.contract.getState(channelId.toString())
        let state = 0
        result = new channel.PaymentChannel(document.sender, document.receiver, document.channelId, null, document.value, document.spent, state)
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
    return this.engine.update(query, update)
  }

  /**
   * Retrieve all the payment channels stored.
   *
   * @return {Promise<PaymentChannel>}
   */
  all () {
    let query = { kind: this.kind }
    return this.engine.find(query).then(found => {
      return _.map(found, doc => {
        return new channel.PaymentChannel(doc.sender, doc.receiver, doc.channelId, doc.contract, doc.value, doc.spent, doc.state)
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
  engine: engine
}
