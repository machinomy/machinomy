/**
 * To run the file, it requires two environment variables to be set.
 * `PROVIDER_URL` is a JSON RPC endpoint. Infura works just fine. For Rinkeby test network,
 * you could set it to `PROVIDER_URL="https://rinkeby.infura.io/"`. Another variable is `MNEMONIC`.
 * It is a [12-word seed phrase](https://github.com/pirapira/ethereum-word-list/blob/master/README.md#mnemonic-phrase).
 * For example, `MNEMONIC="brain surround have swap horror body response double fire dumb bring hazard"`
 *
 * Start this file then:
 *
 * yarn build
 * PROVIDER_URL="https://rinkeby.infura.io/" MNEMONIC="brain surround have swap horror body response double fire dumb bring hazard" node client.js
 *
 * It will open a channel towards the server side, and send a single payment.
 *
 * The server side for selling the content is provided in `server.ts` file.
 */

import * as Web3 from 'web3'
import HDWalletProvider from '@machinomy/hdwallet-provider'
import Machinomy from 'machinomy'
import fetcher from 'machinomy/lib/util/fetcher'
import BigNumber from 'bignumber.js'

async function main (): Promise<string> {
  const PROVIDER_URL = String(process.env.PROVIDER_URL)
  const MNEMONIC = String(process.env.MNEMONIC).trim()

  const TARGET = 'https://playground.machinomy.com/hello-token'
  const provider = HDWalletProvider.http(MNEMONIC, PROVIDER_URL)
  const web3 = new Web3(provider)

  /**
   * Account that send payments payments.
   */
  const sender = await provider.getAddress(0)
  console.log('sender address', sender)

  /**
   * Create machinomy instance that provides API for accepting payments.
   */
  const machinomy = new Machinomy(sender, web3, { databaseUrl: 'sqlite://./client-token' })

  const response = await fetcher.fetch(TARGET)
  const headers = response.headers

  /**
   * Request token to content access
   */
  const result = await machinomy.buy({
    price: new BigNumber(headers.get('paywall-price') || '0'),
    gateway: headers.get('paywall-gateway')!,
    receiver: headers.get('paywall-address')!,
    meta: 'metaidexample',
    tokenContract: headers.get('paywall-token-contract')!
  })

  const token = result.token

  /**
   * Request paid content
   */
  const content = await fetcher.fetch(TARGET, {
    headers: {
      authorization: `paywall ${token} ${'metaidexample'} ${String(headers.get('paywall-price'))} ${String(headers.get('paywall-token-contract'))}`
    }
  })

  // tslint:disable-next-line:no-unnecessary-type-assertion
  const body = content.body! as any // WTF Fetch returns shitty data type
  return body.read().toString()
}

main().then((content: string) => {
  console.log('Bought content: ')
  console.log(`"${content}"`)
  process.exit(0)
}).catch(error => {
  console.error(error)
  process.exit(1)
})
