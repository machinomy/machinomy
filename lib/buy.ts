import * as channel from './channel'
import * as middleware from './middleware'
import * as transport from './transport'
import * as sender from './sender'
import * as storage from './storage'
import * as configuration from './configuration'
import Web3 = require('web3')
import Promise = require('bluebird')

import { Log } from 'typescript-logger'
import { PaymentPair, default as Sender } from './sender'
import { Logger } from 'typescript-logger/build/logger'
import Payment from './Payment'

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
    // web3.personal.unlockAccount(account, password, UNLOCK_PERIOD) // FIXME
  }

  let _transport = transport.build()
  let _storage = storage.build(web3, settings.databaseFile, 'sender', false, settings.engine)
  let contract = channel.contract(web3)
  let client = new Sender(web3, account, contract, _transport, _storage)
  return client.buy({ uri: uri }).then((pair: PaymentPair) => {
    console.log(pair.payment)
    let response = pair.response
    return response.body
  })
}

export default {
  NAME: 'machinomy',
  VERSION: '0.1.5',
  Paywall: middleware.Paywall,
  Transport: transport.Transport,
  transport: transport,
  contract: channel.contract,
  configuration: configuration,
  Payment: Payment,
  storage: storage,
  channel: channel,
  log: log,
  buy: buy,
  sender: sender
}