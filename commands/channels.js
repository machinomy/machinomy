'use strict'

const _ = require('lodash')

const machinomy = require('../index')

const channels = (command) => {
  let namespace = command.namespace || 'sender'
  let settings = machinomy.configuration.sender()
  let web3 = machinomy.configuration.web3()

  let engine = machinomy.storage.engine(settings.databaseFile)
  machinomy.storage.channels(web3, engine, namespace).all().then(found => {
    _.each(found, paymentChannel => {
      machinomy.contract(web3).getState(paymentChannel.channelId).then(state => {
        if (state < 2) {
          paymentChannel.state = state
          console.log(paymentChannel)
        }
      })
    })
  })
}

module.exports = channels
