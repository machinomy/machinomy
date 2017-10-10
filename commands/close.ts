import * as configuration from '../lib/configuration'
import Storage from '../lib/storage'
import Web3 = require('web3')
import CommandPrompt from './CommandPrompt'
import { ChannelContract, PaymentChannel } from '../lib/channel'
import BigNumber = require('bignumber.js')
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

  let s = new Storage(web3, settings.databaseFile, namespace, true, settings.engine)

  if (settings.account) {
    let account = settings.account
    if (settings.engine === 'mongo') {
      mongo.connectToServer(() => {
        let machinomy = new Machinomy(account, web3, {engine: settings.engine})
        machinomy.close(channelId).then(() => {
          mongo.db().close()
          console.log('closed')
        })
      })
    } else {
      let machinomy = new Machinomy(account, web3, { engine: settings.engine })
      machinomy.close(channelId).then(() => {
        mongo.db().close()
        console.log('closed')
      })
    }
  }
}

export default close
