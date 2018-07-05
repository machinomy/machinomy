import homedir = require('homedir')
import { log as Log } from '@machinomy/logger'
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

const log = Log('configuration')

const CONTRACTS = {
  development: '0xede26550428812f833ad7a8d1a9019561d243d6c',
  ropsten: '0xc582877dec917b21fa6b0dc68101b5c01f966325'
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
  return 'nedb://' + path.join(baseDirPath(), DATABASE_FILE)
}

export interface IConfigurationOptions {
  account?: string
  password?: string
  engine?: string
  databaseUrl?: string
}

export class Configuration {
  public account?: string
  public password?: string
  public databaseUrl: string
  public path: string

  constructor (options: IConfigurationOptions) {
    this.account = options.account
    this.password = options.password
    this.databaseUrl = options.databaseUrl || databaseFilePath()
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
    log(error)
    return {}
  }
}

export const sender = (): Configuration => {
  try {
    const options = configurationOptions()
    return new Configuration({
      account: process.env.MACHINOMY_SENDER_ACCOUNT || options.sender.account,
      password: process.env.MACHINOMY_SENDER_PASSWORD || options.sender.password,
      engine: process.env.MACHINOMY_DATABASE_URL || options.sender.databaseUrl
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
      engine: process.env.MACHINOMY_DATABASE_URL || options.receiver.databaseUrl
    })
  } catch (error) {
    log(error)
    return new Configuration({})
  }
}

export function currentProvider (): Web3.Provider {
  if (typeof web3 !== 'undefined') {
    // Use Mist/MetaMask's provider
    return web3.currentProvider
  } else {
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    return new Web3.providers.HttpProvider(process.env.MACHINOMY_GETH_ADDR || 'http://localhost:8545')
  }
}
