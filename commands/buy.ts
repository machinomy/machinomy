import { buyContent } from '../lib/buy'
import CommandPrompt from './CommandPrompt'
import * as configuration from '../lib/configuration'

function buy (uri: string, command: CommandPrompt): void {
  let settings = configuration.sender()
  let password: string = settings.password || ''
  if (command.parent && command.parent.password) {
    password = command.parent.password
  }

  let startBuy = () => {
    if (!settings.account) {
      console.error('Sender account is not defined')
      return
    }
    buyContent(uri, settings.account, password).then(contents => {
      console.log('Buy result:')
      console.log(contents)
    }).catch((error: any) => {
      console.error(error)
    })
  }

  startBuy()
}

export default buy
