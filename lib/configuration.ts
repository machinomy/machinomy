import homedir = require('homedir')
import { Log } from 'typescript-logger'
import path = require('path')
import Web3 = require('web3')
import * as env from './env'

declare var web3: Web3 | undefined

const BASE_DIR = '.machinomy'
const COFNGIRATION_FILE = 'config.json'
const DATABASE_FILE = 'storage.db'
export const VERSION = '0.0.3'
export const PROTOCOL = 'machinomy/' + VERSION
export const PAYWALL_PATH = 'api/paywall/' + PROTOCOL

const log = Log.create('configuration')

const CONTRACTS = {
  development: '0xede26550428812f833ad7a8d1a9019561d243d6c',
  ropsten: '0xc365a7c7d222b781e7b50a95e005d89243fc650d'
}

export const contractAddress = (): string => {
  const container = env.container()
  const network = container.MACHINOMY_NETWORK || 'ropsten'
  const address = container.CONTRACT_ADDRESS
  if (address) {
    return address
  } else {
    return (CONTRACTS as any)[network]
  }
}

export const baseDirPath = (): string => {
  return path.resolve(path.join(homedir(), BASE_DIR))
}

export const configFilePath = (): string => {
  return path.join(baseDirPath(), COFNGIRATION_FILE)
}

const databaseFilePath = (): string => {
  return path.join(baseDirPath(), DATABASE_FILE)
}

export interface IConfigurationOptions {
  account?: string
  password?: string
  engine?: string
}

export class Configuration {
  public account?: string
  public password?: string
  public engine?: string
  public databaseFile: string
  public path: string

  constructor (options: IConfigurationOptions) {
    this.account = options.account
    this.password = options.password
    this.engine = options.engine
    this.databaseFile = databaseFilePath()
    this.path = configFilePath()
  }
}

/**
 * @returns {object}
 */
export const configurationOptions = () => {
  try {
    const fs = require('fs')
    return JSON.parse(fs.readFileSync(configFilePath(), 'utf8'))
  } catch (error) {
    log.error(error)
    return {}
  }
}

export const sender = (): Configuration => {
  try {
    const options = configurationOptions()
    return new Configuration({
      account: process.env.MACHINOMY_SENDER_ACCOUNT || options.sender.account,
      password: process.env.MACHINOMY_SENDER_PASSWORD || options.sender.password,
      engine: process.env.MACHINOMY_SENDER_ENGINE || options.sender.engine
    })
  } catch (error) {
    return new Configuration({})
  }
}

export const receiver = (): Configuration => {
  try {
    const options = configurationOptions()
    return new Configuration({
      account: process.env.MACHINOMY_RECEIVER_ACCOUNT || options.receiver.account,
      password: process.env.MACHINOMY_RECEIVER_PASSWORD || options.receiver.password,
      engine: process.env.MACHINOMY_SENDER_ENGINE || options.receiver.engine
    })
  } catch (error) {
    log.error(error)
    return new Configuration({})
  }
}

export function currentProvider (): Web3.Provider {
  if (typeof web3 !== 'undefined') {
    // Use Mist/MetaMask's provider
    return web3.currentProvider
  } else {
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    return new Web3.providers.HttpProvider('http://localhost:8545')
  }
}
