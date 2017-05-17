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
 * @param {string} uri
 * @param {string} account
 * @param {string} password
 * @return {Promise<string>}
 */
const buy = (uri, account, password) => {
  let settings = configuration.sender()
  let web3 = configuration.web3()
  web3.personal.unlockAccount(account, password, UNLOCK_PERIOD) // FIXME

  let _transport = transport.build()
  let _storage = storage.build(web3, settings.databaseFile, 'sender')
  let contract = channel.contract(web3)
  let client = sender.build(web3, account, contract, _transport, _storage)
  return client.buy({ uri: uri }).then(response => {
    return response[1].body
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
  channel: channel,
  log: log,
  buy: buy,
  sender: sender
}
