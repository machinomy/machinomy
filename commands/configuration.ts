import machinomy from '../lib/buy'
import CommandPrompt from './CommandPrompt'

function configuration (options: CommandPrompt) {
  let namespace = options.namespace || 'sender'
  let configuration = machinomy.configuration.sender()
  if (namespace === 'receiver') {
    configuration = machinomy.configuration.receiver()
  }

  console.log(configuration)
}

export default configuration
