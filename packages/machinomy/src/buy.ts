import * as configuration from './configuration'
import * as Web3 from 'web3'
import Machinomy from './Machinomy'
import BuyResult from './BuyResult'

/**
 * Shortcut for Sender.buy.
 */
export async function buyContent (uri: string, account: string, password: string): Promise<BuyResult> {
  let settings = configuration.sender()
  let web3 = new Web3()
  web3.setProvider(configuration.currentProvider())
  if (web3.personal) {
    // web3.personal.unlockAccount(account, password, UNLOCK_PERIOD) // FIXME
  }

  let client = new Machinomy(account, web3, settings)
  let pair = await client.buyUrl(uri)
  await client.shutdown()
  return pair
}
