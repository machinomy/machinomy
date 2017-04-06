'use strict'

const fs = require('fs')
const path = require('path')
const cors = require('cors')
const express = require('express')
const bodyParser = require('body-parser')
const machinomy = require('./../index')

const settings = machinomy.configuration.receiver()
let web3 = machinomy.configuration.web3()
web3.personal.unlockAccount(settings.account, settings.password, 1000)

const paywall = new machinomy.Paywall(web3, settings.account, 'http://localhost:3000')

const app = express()
app.use(bodyParser.json())

app.use(cors({
  origin: '*',
  credentials: true,
  allowedHeaders: ['content-type', 'paywall-version', 'paywall-address', 'paywall-gateway', 'paywall-price', 'paywall-token', 'authorization'],
  exposedHeaders: ['paywall-version', 'paywall-address', 'paywall-gateway', 'paywall-price', 'paywall-token']
}))
app.use(paywall.middleware())

const COST = 61200000000
app.get('/outline', paywall.guard(COST, (req, res) => {
  let filepath = path.join(__dirname, 'response.txt')
  let content = fs.readFileSync(filepath).toString()
  res.write(content)
  res.end()
}))

app.listen(3000, () => {
  console.log('Waiting at http://localhost:3000/outline')
})
