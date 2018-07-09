import * as config from 'machinomy/lib/configuration'
import * as fs from 'fs'
import CommandPrompt from './CommandPrompt'
const prompt = require('prompt')

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

  prompt.message = ''
  prompt.colors = false
  prompt.start()
  console.log('Please, for a command line client insert you Ethereum account address, and optionally a password')
  console.log('For ' + namespace)
  type AccountPasswordType = { account: string, password: string }
  prompt.get(['account', 'password'], (err: Error, result: AccountPasswordType) => {
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
