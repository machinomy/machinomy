'use strict'

const machinomy = require('../index')

const pry = (uri) => {
  let settings = machinomy.configuration.sender()
  let transport = machinomy.transport.build()
  let storage = new machinomy.Storage(settings.databaseFile, 'sender')
  let web3 = machinomy.configuration.web3()
  let contract = machinomy.contract(web3)
  let client = machinomy.sender.build(web3, settings.account, contract, transport, storage)
  client.pry(uri).then(paymentRequired => {
    console.log(paymentRequired)
  }).catch(error => {
    console.error(error)
  })
}

module.exports = pry
