import CommandPrompt from './CommandPrompt'
import * as configuration from '../lib/configuration'
import Web3 = require('web3')
import mongo from '../lib/mongo'
import Machinomy from '../index'

function channels (command: CommandPrompt): void {
  let settings = configuration.sender()
  let provider = configuration.currentProvider()
  let web3 = new Web3(provider)

  if (settings.account) {
    let account = settings.account
    if (settings.engine === 'mongo') {
      mongo.connectToServer().then(() => {
        let machinomy = new Machinomy(account, web3, { engine: settings.engine })
        machinomy.channels().then((channels: any) => {
          console.log(channels)
          mongo.db().close()
        }).catch((e: Error) => {
          console.log(e)
        })
      }).catch((e: Error) => {
        console.log(e)
      })
    } else {
      let machinomy = new Machinomy(account, web3, { engine: settings.engine })
      machinomy.channels().then((channels: any) => {
        console.log(channels)
      }).catch((e: Error) => {
        console.log(e)
      })
    }
  }
}

export default channels
