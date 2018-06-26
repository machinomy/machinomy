// import machinomy from '../lib/buy'
import * as config from '../../machinomy/lib/configuration'
import * as fs from 'fs'
import prompt = require('prompt')
import CommandPrompt from './CommandPrompt'
const setup = (command: CommandPrompt) => {
  let namespace = command.namespace || 'sender'

  let baseDirPath = config.baseDirPath()
  if (!fs.existsSync(baseDirPath)) {
    fs.mkdirSync(baseDirPath)
  }

  type Configuration = {
    account: string,
    password: string
  }
  let configuration: {[namespace: string]: Configuration}

  try {
    configuration = config.configurationOptions()
  } catch (ex) {
    configuration = {}
  }

  prompt.message = null
  prompt.colors = false
  prompt.start()
  console.log('Please, for a command line client insert you Ethereum account address, and optionally a password')
  console.log('For ' + namespace)
  prompt.get<{account: string, password: string}>(['account', 'password'], function (err, result) {
    if (err) {
      throw err
    }
    configuration[namespace] = result
    console.log('')
    console.log('Full configuration:')
    console.log(configuration)
    let configurationString = JSON.stringify(configuration, null, 4)
    fs.writeFileSync(config.configFilePath(), configurationString)
  })
}

export default setup
