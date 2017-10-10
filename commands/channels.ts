import CommandPrompt from './CommandPrompt'
import * as configuration from '../lib/configuration'
import _ = require('lodash')
import Web3 = require('web3')
import mongo from '../lib/mongo'
import Machinomy from '../index'

function channels (command: CommandPrompt): void {
  let namespace = command.namespace || 'sender'
  let settings = configuration.sender()
  let provider = configuration.currentProvider()
  let web3 = new Web3(provider)

  if (settings.account) {
    let account = settings.account
    if (settings.engine === 'mongo') {
      mongo.connectToServer(() => {
        let machinomy = new Machinomy(account, web3, { engine: settings.engine })
        machinomy.channels().then((channels: any) => {
          console.log(channels)
          mongo.db().close()
        })
      })
    } else {
      let machinomy = new Machinomy(account, web3, { engine: settings.engine })
      machinomy.channels().then((channels: any) => {
        console.log(channels)
      })
    }
  }
}

export default channels
