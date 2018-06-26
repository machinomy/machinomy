import * as fs from 'fs'
import * as path from 'path'
import * as commander from 'commander'
import homedir = require('homedir')
import setup from './setup'
import buy from './buy'
import pry from './pry'
import channels from './channels'
import close from './close'
import configuration from './configuration'

const PACKAGE_PATH = path.resolve(__dirname, '..', 'package.json')
const PACKAGE = JSON.parse(fs.readFileSync(PACKAGE_PATH).toString())
const BASE_DIR = '.machinomy'
const CONFIGURATION_FILE = 'config.json'

const baseDirPath = function (): string {
  return path.resolve(path.join(homedir(), BASE_DIR))
}

const ensureBaseDirPresent = function (): void {
  if (!fs.existsSync(baseDirPath())) {
    fs.mkdirSync(baseDirPath())
  }
}

const canCreateDatabase = function (): boolean {
  try {
    fs.accessSync(baseDirPath(), fs.constants.R_OK | fs.constants.W_OK)
    return true
  } catch (ex) {
    return false
  }
}

const configFilePath = function (): string {
  return path.join(baseDirPath(), CONFIGURATION_FILE)
}

const canReadConfig = function (): boolean {
  try {
    fs.accessSync(configFilePath(), fs.constants.R_OK)
    return true
  } catch (ex) {
    return false
  }
}

/**
 * @returns {object}
 */
const configurationOptions = function (): object {
  return JSON.parse(fs.readFileSync(configFilePath(), 'utf8'))
}

const canParseConfig = function (): boolean {
  try {
    configurationOptions()
    return true
  } catch (ex) {
    return false
  }
}

const ensure = function (command: Function) {
  return function () {
    ensureBaseDirPresent()

    if (!canCreateDatabase()) {
      console.error('Can not create database file in ' + baseDirPath() + '. Please, check if one can create a file there.')
    } else if (!canReadConfig()) {
      console.error('Can not read configuration file. Please, check if it exists, or run `machinomy setup` command for an initial configuration')
    } else if (!canParseConfig()) {
      console.error('Can not parse configuration file. Please, ')
    } else {
      command.apply(null, arguments)
    }
  }
}

const main = function (args: string[]) {
  let version = PACKAGE.name + ' v' + PACKAGE.version
  let parser = commander
    .version(version)
    .option('-P, --password [password]', 'password to unlock the account')

  parser.command('buy <uri>')
    .description('buy a resource at <uri>')
    .action(ensure(buy))

  parser.command('pry <uri>')
    .description('see cost of a resource at <uri>')
    .action(ensure(pry))

  parser.command('channels')
    .option('-n, --namespace [value]', 'find channels under namespace [sender]')
    .description('show open/closed channels')
    .action(ensure(channels))

  parser.command('close <channelId>')
    .option('-n, --namespace [value]', 'find channels under namespace [sender]')
    .description('close the channel')
    .action(ensure(close))

  parser.command('configuration')
    .alias('config')
    .option('-n, --namespace [value]', 'use namespace [sender]')
    .description('display configuration')
    .action(ensure(configuration))

  parser.command('setup')
    .description('initial setup')
    .option('-n, --namespace [value]', 'use namespace [sender]')
    .action(setup)

  parser.parse(args)
}

module.exports = {
  main: main
}
