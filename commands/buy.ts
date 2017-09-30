import machinomy from '../lib/buy'
import CommandPrompt from './CommandPrompt'
import mongo from '../lib/mongo'

function buy (uri: string, command: CommandPrompt): void {
  let settings = machinomy.configuration.sender()
  let password: string = settings.password || ''
  if (command.parent && command.parent.password) {
    password = command.parent.password
  }

  let startBuy = () => {
    if (!settings.account) {
      console.error('Sender account is not defined')
      return
    }
    machinomy.buy(uri, settings.account, password).then(contents => {
      if (settings.engine === 'mongo') {
        mongo.db().close()
      }
    }).catch((error: any) => {
      console.error(error)
    })
  }
  if (settings.engine === 'mongo') {
    mongo.connectToServer(() => {
      startBuy()
    })
  } else {
    startBuy()
  }
}

export default buy
