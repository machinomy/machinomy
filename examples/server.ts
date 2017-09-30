import cors = require('cors')
import express = require('express')
import bodyParser = require('body-parser')
import Web3 = require('web3')
import machinomy from '../lib/buy'
import { Paywall } from '../lib/middleware'

const settings = machinomy.configuration.receiver()
let provider = machinomy.configuration.currentProvider()
let web3 = new Web3(provider)
if (web3.personal && settings.account && settings.password) {
  // web3.personal.unlockAccount(settings.account, settings.password, 1000)

  const app = express()
  app.use(bodyParser.json())

  machinomy.Paywall.build(web3, settings.account, 'http://localhost:3000', null).then((paywall: Paywall) => {
    app.use(cors({
      origin: '*',
      credentials: true,
      allowedHeaders: ['content-type', 'paywall-version', 'paywall-address', 'paywall-gateway', 'paywall-price', 'paywall-token', 'authorization'],
      exposedHeaders: ['paywall-version', 'paywall-address', 'paywall-gateway', 'paywall-price', 'paywall-token']
    }))

    app.use(paywall.middleware())

    const COST = 61200000000
    app.get('/outline', paywall.guard(COST, (req: any, res: any) => {
      /*
      let filepath = path.join(__dirname, 'response.txt')
      let content = fs.readFileSync(filepath).toString()
      */
      res.write('Response')
      res.end()
    }))

    app.listen(3000, () => {
      console.log('Waiting at http://localhost:3000/outline')
    })

  }).catch(reason => {
    console.log('Oops, can not start paywall:', reason)
  })
}
