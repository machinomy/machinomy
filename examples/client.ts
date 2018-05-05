import * as Web3 from 'web3'
import * as HDWalletProvider from 'truffle-hdwallet-provider'
import Machinomy from '../'
import fetcher from '../lib/util/fetcher'

async function main (): Promise<string> {
  const PROVIDER_URL = String(process.env.PROVIDER_URL)
  const MNEMONIC = String(process.env.MNEMONIC)

  console.log(MNEMONIC)
  const provider = new HDWalletProvider(MNEMONIC, PROVIDER_URL)
  const web3 = new Web3(provider)

  /**
   * Account that send payments payments.
   */
  let sender = provider.getAddress(0)

  /**
   * Create machinomy instance that provides API for accepting payments.
   */
  let machinomy = new Machinomy(sender, web3, { databaseUrl: 'nedb://./client' })

  let response = await fetcher.fetch('http://localhost:3000/content')
  let headers = response.headers

  /**
   * Request token to content access
   */
  let result = await machinomy.buy({
    price: Number(headers.get('paywall-price')),
    gateway: headers.get('paywall-gateway')!,
    receiver: headers.get('paywall-address')!,
    meta: 'metaidexample'
  })

  let token = result.token

  /**
   * Request paid content
   */
  let content = await fetcher.fetch('http://localhost:3000/content', {
    headers: {
      authorization: `paywall ${token}`
    }
  })

  let body = content.body! as any // WTF Fetch returns shitty data type
  return body.read().toString()
}

main().then(text => {
  console.log(text)
  process.exit(0)
}).catch(error => {
  console.error(error)
  process.exit(1)
})
