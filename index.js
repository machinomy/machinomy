'use strict'

const channel = require('./lib/channel')
const middleware = require('./lib/middleware')
const transport = require('./lib/transport')
const sender = require('./lib/sender')
const storage = require('./lib/storage')
const configuration = require('./lib/configuration')
const log = require('./lib/log')

const UNLOCK_PERIOD = 1000

/**
 * Shortcut for Sender.buy.
 *
 * @param {String} uri
 * @param {String} account
 * @param {String} password
 * @param _callback
 */
const buy = (uri, account, password, _callback) => {
  let settings = configuration.sender()
  channel.web3.personal.unlockAccount(account, password, UNLOCK_PERIOD)

  let _transport = transport.build()
  let _storage = storage.build(settings.databaseFile, 'sender')
  let client = sender.build(account, channel.contract, _transport, _storage)
  client.buy(uri, function (error, response) {
    _callback(error, response.body)
  })
}

module.exports = {
  NAME: 'machinomy',
  VERSION: '0.1.5',
  Paywall: middleware.Paywall,
  Transport: transport.Transport,
  Storage: storage.Storage,
  web3: channel.web3,
  transport: transport,
  contract: channel.contract,
  configuration: configuration,
  Payment: channel.Payment,
  storage: storage,
  log: log,
  buy: buy,
  sender: sender
}
