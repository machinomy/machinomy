import * as express from 'express'
import * as bodyParser from 'body-parser'
import Machinomy from 'machinomy'
import * as dotenv from 'dotenv'
import HDWalletProvider from '@machinomy/hdwallet-provider'
import * as Web3 from 'web3'
import Paywall from './Paywall'
import * as BigNumber from 'bignumber.js'
import * as morgan from 'morgan'
import * as url from 'url'

async function main () {
  dotenv.config()

  const HOST = String(process.env.HOST)
  const PORT = Number(process.env.PORT)

  const MNEMONIC = String(process.env.MNEMONIC).trim()
  const PROVIDER_URL = String(process.env.PROVIDER_URL)
  const DATABASE_URL = String(process.env.DATABASE_URL)

  const provider = new HDWalletProvider(MNEMONIC, PROVIDER_URL)
  const web3 = new Web3(provider)
  const account = await provider.getAddress(0)
  const machinomy = new Machinomy(account, web3, { databaseUrl: DATABASE_URL })
  const base = new url.URL(`https://${HOST}`)
  const paywall = new Paywall(machinomy, account, base)

  let app = express()
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: false }))
  app.use(paywall.middleware())
  app.use(morgan('combined'))

  app.get('/hello', paywall.guard(new BigNumber.BigNumber(1000), (req, res) => {
    res.end('Thank you for the payment!')
  }))

  app.listen(PORT, () => {
    console.log(`Waiting at http://${HOST}/hello`)
  })
}

main().then(() => {
  // Do Nothing
}).catch(error => {
  console.error(error)
  process.exit(1)
})
