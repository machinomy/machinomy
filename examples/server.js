'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const machinomy = require('./../index')

const settings = machinomy.configuration.receiver()
let web3 = machinomy.configuration.web3()
web3.personal.unlockAccount(settings.account, settings.password, 1000)

const paywall = new machinomy.Paywall(web3, settings.account, 'http://localhost:3000')

const app = express()
app.use(bodyParser.json())
app.use(paywall.middleware())

app.get('/hello', paywall.guard(1000, (req, res) => {
  res.write('Have just received 1000 wei.\n')
  res.end('Hello, meat world!')
}))

app.listen(3000, () => {
  console.log('Waiting at http://localhost:3000/hello')
})
