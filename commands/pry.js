'use strict'

const machinomy = require('../index')

const pry = (uri) => {
  let settings = machinomy.configuration.sender()
  let transport = machinomy.transport.build()
  let storage = new machinomy.Storage(settings.databaseFile, 'sender')
  let client = machinomy.sender.build(settings.account, machinomy.contract, transport, storage)
  client.pry(uri).then(paymentRequired => {
    console.log(paymentRequired)
  }).catch(error => {
    console.error(error)
  })
}

module.exports = pry
