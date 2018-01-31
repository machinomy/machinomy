
import Web3 = require('web3')
import Machinomy from '../index'

let f = (async () => {
  let fetch = require('whatwg-fetch').fetch
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
  let machinomy = new Machinomy(sender, web3, { engine: 'nedb', databaseFile: 'machinomy_client'})

  let response = await fetch('http://localhost:3000/content')
  let headers = response.headers.map

  /**
   * Request token to content access
   */
  let result = await machinomy.buy({
    price: Number(headers['paywall-price']),
    gateway: headers['paywall-gateway'],
    receiver: headers['paywall-address'],
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

  console.log(content._bodyText)
})

f().then().catch((e) => {
  console.log(e)
})
