import machinomy from '../index'
import CommandPrompt from './CommandPrompt'

function buy (uri: string, command: CommandPrompt): void {
  let settings = machinomy.configuration.sender()
  let password: string = settings.password || ''
  if (command.parent && command.parent.password) {
    password = command.parent.password
  }

  if (settings.account) {
    machinomy.buy(uri, settings.account, password).then(contents => {
      console.log(contents)
    }).catch((error: any) => {
      console.error(error)
    })
  } else {
    console.error('Sender account is not defined')
  }
}

export default buy
