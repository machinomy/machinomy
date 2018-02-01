import * as configuration from './configuration'
import Web3 = require('web3')
import Machinomy, { BuyResult } from '../index'

/**
 * Shortcut for Sender.buy.
 */
export function buyContent (uri: string, account: string, password: string): Promise<BuyResult> {
  let settings = configuration.sender()
  let web3 = new Web3()
  web3.setProvider(configuration.currentProvider())
  if (web3.personal) {
    // web3.personal.unlockAccount(account, password, UNLOCK_PERIOD) // FIXME
  }

  let client = new Machinomy(account, web3, settings)
  return client.buyUrl(uri).then((pair: BuyResult) => {
    return client.shutdown().then(() => pair)
  })
}
