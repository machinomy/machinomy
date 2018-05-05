import * as Web3 from 'web3'
import Machinomy from '../'
import fetcher from '../lib/util/fetcher'

async function main (): Promise<string> {
  /**
   * Account that send payments payments.
   */
  let sender = '0x5bf66080c92b81173f470e25f9a12fc146278429'

  /**
   * Geth must be run on local machine, or use another web3 provider.
   */
  let provider = new Web3.providers.HttpProvider('http://localhost:8545')
  let web3 = new Web3(provider)

  /**
   * Create machinomy instance that provides API for accepting payments.
   */
  let machinomy = new Machinomy(sender, web3, { databaseUrl: 'nedb://./machinomy_client' })

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
  let content = await fetch('http://localhost:3000/content', {
    headers: {
      authorization: `paywall ${token}`
    }
  })

  return content.body!.getReader().read().then(v => v as string)
}

main().then(text => {
  console.log(text)
}).catch(error => {
  console.error(error)
  process.exit(1)
})
