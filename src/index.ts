import * as channel from './lib/channel'
import * as middleware from './lib/middleware'
import * as transport from './lib/transport'
import * as sender from './lib/sender'
import * as storage from './lib/storage'
import * as configuration from './lib/configuration'
import Web3 = require('web3')
import Promise = require('bluebird')

import { Log } from 'ng2-logger'
import { PaymentPair, Sender } from './lib/sender'
import { Logger } from 'ng2-logger/src/logger'

export const log: Logger<any> = Log.create('machinomy')

const UNLOCK_PERIOD = 1000

/**
 * Shortcut for Sender.buy.
 */
function buy (uri: string, account: string, password: string): Promise<string> {
  let settings = configuration.sender()
  let web3 = new Web3()
  web3.setProvider(configuration.currentProvider())
  if (web3.personal) {
    web3.personal.unlockAccount(account, password, UNLOCK_PERIOD) // FIXME
  }

  let _transport = transport.build()
  let _storage = storage.build(web3, settings.databaseFile, 'sender')
  let contract = channel.contract(web3)
  let client = new Sender(web3, account, contract, _transport, _storage)
  return client.buy({ uri: uri }).then((pair: PaymentPair) => {
    let response = pair.response
    return response.body
  })
}

export default {
  NAME: 'machinomy',
  VERSION: '0.1.5',
  Paywall: middleware.Paywall,
  Transport: transport.Transport,
  Storage: storage.Storage,
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
