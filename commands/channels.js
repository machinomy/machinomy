'use strict'

const _ = require('lodash')

const machinomy = require('../index')

const channels = (command) => {
  let namespace = command.namespace || 'sender'
  let settings = machinomy.configuration.sender()

  let engine = machinomy.storage.engine(settings.databaseFile)
  machinomy.storage.channels(engine, namespace).all().then(found => {
    _.each(found, paymentChannel => {
      let state = machinomy.contract.getState(paymentChannel.channelId)
      if (state < 2) {
        paymentChannel.state = state
        console.log(paymentChannel)
      }
    })
  })
}

module.exports = channels
