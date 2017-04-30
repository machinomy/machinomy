'use strict'

const machinomy = require('./index')
const _ = require('lodash')
const Promise = require('bluebird')

const uri = process.argv[2]

const settings = machinomy.configuration.sender()
const UNLOCK_PERIOD = 1000

let web3 = machinomy.configuration.web3()
web3.personal.unlockAccount(settings.account, settings.password, UNLOCK_PERIOD) // FIXME

let _transport = machinomy.transport.build()
let _storage = machinomy.storage.build(web3, settings.databaseFile, 'sender')
let contract = machinomy.channel.contract(web3)
let client = machinomy.sender.build(web3, settings.account, contract, _transport, _storage)
let rr = {
  headers: {
    "paywall-version": "0.0.3",
    "paywall-price": 612,
    "paywall-address": "0x0434984cd3959c18d7e17ee3fc35a2a6249ca828",
    "paywall-gateway": "http://localhost:3000/paywall/machinomy/0.0.3"
  }
}

let prev = new Date().getTime()
const buy = () => {
  client.handlePaymentRequired(uri, rr).then(response => {
    let now = new Date().getTime()
    let delta = now - prev
    console.log(delta)
    prev = now
    buy()
  })
}

buy()

/*
let prev = new Date().getTime()
const buy = (fun) => {
  return machinomy.buy(uri, settings.account, settings.password).then(contents => {
    let now = new Date().getTime()
    let delta = now - prev
    console.log(delta)
    prev = now
    fun(fun)
  })
}

buy(buy)
*/
