import * as configuration from '../lib/configuration'
import CommandPrompt from './CommandPrompt'
import Machinomy from '../index'
import Web3 = require('web3')

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

    let machinomy = new Machinomy(account, web3, { databaseUrl: settings.databaseUrl })
    machinomy.close(channelId).then(() => {
      console.log('closed')
    }).catch((e: Error) => {
      console.log(e)
    }).then(() => {
      return machinomy.shutdown()
    }).catch((e) => {
      console.error('Failed to cleanly shut down:')
      console.error(e)
      process.exit(1)
    })
  }
}

export default close
