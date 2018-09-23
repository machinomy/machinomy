import * as express from 'express'
import * as bodyParser from 'body-parser'
import * as dotenv from 'dotenv'
import HDWalletProvider from '@machinomy/hdwallet-provider'
import * as contracts from '@machinomy/contracts'
import Paywall from './Paywall'
import * as morgan from 'morgan'
import * as url from 'url'
import * as BigNumber from 'bignumber.js'

async function main () {
  dotenv.config()

  const HOST = String(process.env.HOST)
  const PORT = Number(process.env.PORT)

  const MNEMONIC = String(process.env.MNEMONIC).trim()
  const PROVIDER_URL = String(process.env.PROVIDER_URL)
  const GATEWAY_URL = String(process.env.GATEWAY_URL)

  const provider = HDWalletProvider.http(MNEMONIC, PROVIDER_URL)
  const account = await provider.getAddress(0)
  const base = new url.URL(GATEWAY_URL)
  const paywall = new Paywall(account, base)

  const instanceTestToken: contracts.TestToken.Contract = await contracts.TestToken.contract(provider).deployed()

  const tokenContract = instanceTestToken.address

  let app = express()
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: false }))
  app.use(paywall.middleware())
  app.use(morgan('combined'))

  app.get('/hello', paywall.guard(new BigNumber.BigNumber(1000), (req, res) => {
    res.end('Thank you for the payment!')
  }))

  app.get('/hello-token', paywall.guardToken(new BigNumber.BigNumber(5), tokenContract, (req, res) => {
    res.end('Thank you for the payment!')
  }))

  app.listen(PORT, () => {
    console.log(`Waiting at http(s)://${HOST}:${PORT}/hello`)
    console.log(`Waiting at http(s)://${HOST}:${PORT}/hello-token`)
  })
}

main().then(() => {
  // Do Nothing
}).catch(error => {
  console.error(error)
  process.exit(1)
})
