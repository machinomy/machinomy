import * as configuration from '../lib/configuration'
import Web3 = require('web3')
import CommandPrompt from './CommandPrompt'
import mongo from '../lib/mongo'
import Machinomy from '../index'

let provider = configuration.currentProvider()
let web3 = new Web3(provider)

function close (channelId: string, options: CommandPrompt): void {
  let namespace = options.namespace || 'sender'
  let settings = configuration.sender()
  if (namespace === 'receiver') {
    settings = configuration.receiver()
  }

  let password = settings.password
  if (options.parent && options.parent.password) {
    password = options.parent.password
  }

  if (web3.personal && settings.account) {
    web3.personal.unlockAccount(settings.account, password, 1000)
  }

  if (settings.account) {
    let account = settings.account
    if (settings.engine === 'mongo') {
      mongo.connectToServer().then(() => {
        let machinomy = new Machinomy(account, web3, {engine: settings.engine})
        machinomy.close(channelId).then(() => {
          mongo.db().close()
          console.log('closed')
        }).catch((e: Error) => {
          console.log(e)
        })
      }).catch((e: Error) => {
        console.log(e)
      })
    } else {
      let machinomy = new Machinomy(account, web3, { engine: settings.engine })
      machinomy.close(channelId).then(() => {
        mongo.db().close()
        console.log('closed')
      }).catch((e: Error) => {
        console.log(e)
      })
    }
  }
}

export default close
