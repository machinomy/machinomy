
import * as express from 'express'
import Web3 = require('web3')
import Machinomy from '../index'
import Payment from '../lib/Payment'
import * as bodyParser from 'body-parser';

let fetch = require('whatwg-fetch').fetch

let receiver = '0xebeab176c2ca2ae72f11abb1cecad5df6ccb8dfe'

let provider = new Web3.providers.HttpProvider('http://localhost:8545')
let web3 = new Web3(provider)
let machinomy = new Machinomy(receiver, web3, { engine: 'nedb' })
let hub = express()
hub.use(bodyParser.json());
hub.use(bodyParser.urlencoded({ extended: false }));
hub.post('/machinomy', async (req: express.Request, res: express.Response, next: Function) => {
  let payment = new Payment(req.body)
  console.log(payment)
  let token = await machinomy.acceptPayment(payment)
  res.status(202).header('Paywall-Token', token).send('Accepted').end()
})

hub.get('/verify', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  let token: string = req.query.token
  let isOk = false
  isOk = await machinomy.verifyToken(token)
  if (isOk) {
    res.status(200).send({ status: 'ok' })
  } else {
    res.status(500).send({ status: 'token is invalid' })
  }
})

let port = 3001
hub.listen(port, function () {
  console.log('UB is ready on ' + port)
})

let app = express()

export const HEADER_NAME = 'authorization'
export const TOKEN_NAME = 'paywall'

const parseToken = (req: express.Request, callback: Function) => {
  let content = req.get(HEADER_NAME)
  if (content) {
    let authorization = content.split(' ')
    let type = authorization[0].toLowerCase()
    let token = authorization[1]
    if (type === TOKEN_NAME) {
      callback(null, token)
    } else {
      callback(`Invalid ${HEADER_NAME} token name present. Expected ${TOKEN_NAME}, got ${type}`)
    }
  } else {
    callback(`No ${HEADER_NAME} header present`)
  }
}

let paywallHeaders = () => {
  let headers: { [index: string]: string } = {}
  headers['Paywall-Version'] = '0.0.3'
  headers['Paywall-Price'] = '0.1'
  headers["Paywall-Address"] = '0xebeab176c2ca2ae72f11abb1cecad5df6ccb8dfe'
  headers['Paywall-Gateway'] = 'http://localhost:3001/machinomy'
  return headers
}

app.get('/content', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  let reqUrl = 'http://localhost:3001/verify'
  parseToken(req, async (error:Error, token:string) => {
    let response = await fetch(reqUrl, {token: token})
 
    let status = (await response.json()).status
    if (status === 'ok') {
      res.send('rich')
    } else {
      res.status(402).set(paywallHeaders()).send('bitch')
    }
  })
})

let portApp = 3000
app.listen(portApp, function () {
  console.log('Content proveder is ready on ' + portApp)
})
