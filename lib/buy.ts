import * as channel from './channel'
import * as transport from './transport'
import * as storage from './storage'
import * as configuration from './configuration'
import Web3 = require('web3')
import { PaymentPair, default as Sender } from './sender'

// const UNLOCK_PERIOD = 1000

/**
 * Shortcut for Sender.buy.
 */
export function buyContent (uri: string, account: string, password: string): Promise<string> {
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
    return _storage.close().then(() => pair.response.body)
  })
}
