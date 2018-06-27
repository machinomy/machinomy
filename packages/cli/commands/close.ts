import * as configuration from 'machinomy/lib/configuration'
import CommandPrompt from './CommandPrompt'
import Machinomy from 'machinomy'
import * as Web3 from 'web3'

let provider = configuration.currentProvider()
let web3 = new Web3(provider)

async function close (channelId: string, options: CommandPrompt): Promise<void> {
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

    try {
      let machinomy = new Machinomy(account, web3, { databaseUrl: settings.databaseUrl })
      await machinomy.close(channelId)
      console.log('closed')
      await machinomy.shutdown()
    } catch (error) {
      console.error('Failed to clearly close the channel:')
      console.error(error)
      process.exit(1)
    }
  }
}

export default close
