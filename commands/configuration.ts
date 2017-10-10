import * as conf from '../lib/configuration'
import CommandPrompt from './CommandPrompt'

function configuration (options: CommandPrompt) {
  let namespace = options.namespace || 'sender'
  let configuration = conf.sender()
  if (namespace === 'receiver') {
    configuration = conf.receiver()
  }

  console.log(configuration)
}

export default configuration
