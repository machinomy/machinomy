'use strict'

const machinomy = require('../index')

const pry = (uri) => {
  let settings = machinomy.configuration.sender()
  let transport = new machinomy.Transport()
  let storage = new machinomy.Storage(settings.databaseFile, 'sender')
  let client = machinomy.sender.build(settings.account, machinomy.contract, transport, storage)
  client.pry(uri, function (error, paymentRequired) {
    if (error) {
      console.log(error)
    } else {
      console.log(paymentRequired)
    }
  })
}

module.exports = pry
