import Web3 = require('web3')
import Engine from './engines/engine'
import EngineMongo from './engines/engine_mongo'
import EngineNedb from './engines/engine_nedb'

import ChannelsDatabase from './storages/channels_database'
import TokensDatabase from './storages/tokens_database'
import PaymentsDatabase from './storages/payments_database'

const defaultEngineName = 'nedb'

export const payments = (engine: Engine, namespace: string | null): PaymentsDatabase => {
  return new PaymentsDatabase(engine, namespace)
}

export const tokens = (engine: Engine, namespace: string | null): TokensDatabase => {
  return new TokensDatabase(engine, namespace)
}

export const channels = (web3: Web3, engine: Engine, namespace: string | null): ChannelsDatabase => {
  return new ChannelsDatabase(web3, engine, namespace)
}

/**
 * Instantiate a storage engine.
 */
export const engine = (path: string, inMemoryOnly: boolean = false, engineName: string = defaultEngineName): Engine => {
  if (engineName === 'nedb') {
    return new EngineNedb(path, inMemoryOnly)
  } else if (engineName === 'mongo') {
    return new EngineMongo(path, inMemoryOnly)
  } else {
    throw new Error('Can not detect datastore enigine')
  }
}

export default class Storage {
  namespace: string|null
  // db: any
  channels: ChannelsDatabase
  tokens: TokensDatabase
  payments: PaymentsDatabase

  constructor (web3: Web3, path: string, namespace: string|null, inMemoryOnly?: boolean, engineName: string = defaultEngineName) {
    let storageEngine = engine(path, inMemoryOnly, engineName)
    this.namespace = namespace || null
    // this.db = storageEngine.datastore
    this.channels = channels(web3, storageEngine, namespace)
    this.tokens = tokens(storageEngine, namespace)
    this.payments = payments(storageEngine, namespace)
  }
}

/**
 * Build an instance of Storage.
 */
export const build = (web3: Web3, path: string, namespace: string | null = null, inMemoryOnly?: boolean, engineName: string = defaultEngineName): Storage => {
  return new Storage(web3, path, namespace, inMemoryOnly, engineName)
}
