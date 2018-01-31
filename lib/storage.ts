import Web3 = require('web3')
import Engine, { EngineMongo, EngineNedb, EnginePostgres } from './engines/engine'

import ChannelsDatabase, {
  MongoChannelsDatabase, NedbChannelsDatabase,
  PostgresChannelsDatabase
} from './storages/channels_database'
import TokensDatabase, {
  MongoTokensDatabase, NedbTokensDatabase,
  PostgresTokensDatabase
} from './storages/tokens_database'
import PaymentsDatabase, {
  MongoPaymentsDatabase, NedbPaymentsDatabase,
  PostgresPaymentsDatabase
} from './storages/payments_database'

const defaultEngineName = 'nedb'

export const payments = (engine: Engine, namespace: string | null): PaymentsDatabase => {
  if (engine instanceof EngineMongo) {
    return new MongoPaymentsDatabase(engine, namespace)
  }

  if (engine instanceof EnginePostgres) {
    return new PostgresPaymentsDatabase(engine, namespace)
  }

  if (engine instanceof EngineNedb) {
    return new NedbPaymentsDatabase(engine, namespace)
  }

  throw new Error('Invalid engine.')
}

export const tokens = (engine: Engine, namespace: string | null): TokensDatabase => {
  if (engine instanceof EngineMongo) {
    return new MongoTokensDatabase(engine, namespace)
  }

  if (engine instanceof EnginePostgres) {
    return new PostgresTokensDatabase(engine, namespace)
  }

  if (engine instanceof EngineNedb) {
    return new NedbTokensDatabase(engine, namespace)
  }

  throw new Error('Invalid engine.')
}

export const channels = (web3: Web3, engine: Engine, namespace: string | null): ChannelsDatabase => {
  if (engine instanceof EngineMongo) {
    return new MongoChannelsDatabase(web3, engine, namespace)
  }

  if (engine instanceof EnginePostgres) {
    return new PostgresChannelsDatabase(web3, engine, namespace)
  }

  if (engine instanceof EngineNedb) {
    return new NedbChannelsDatabase(web3, engine, namespace)
  }

  throw new Error('Invalid engine.')
}

/**
 * Instantiate a storage engine.
 */
export const engine = (path: string, inMemoryOnly: boolean = false, engineName?: string | Engine): Engine => {
  if (!engineName) {
    engineName = defaultEngineName
  }

  let engine: Engine | null

  switch (engineName) {
    case 'nedb':
      engine = new EngineNedb(path, inMemoryOnly)
      break
    case 'mongo':
      engine = new EngineMongo()
      break
    case 'postgres':
      engine = new EnginePostgres()
      break
    default:
      engine = typeof engineName === 'string' ? null : engineName
      break
  }

  if (!engine) {
    throw new Error('Invalid engine.')
  }

  return engine
}

export default class Storage {
  namespace: string | null
  // db: any
  channels: ChannelsDatabase
  tokens: TokensDatabase
  payments: PaymentsDatabase
  engine: Engine

  constructor (web3: Web3, path: string, namespace: string | null, inMemoryOnly?: boolean, engineName?: string | Engine) {
    if (!engineName) {
      engineName = defaultEngineName
    }
    const storageEngine = (typeof engineName === 'string' ? engine(path, inMemoryOnly, engineName) : engineName)
    this.engine = storageEngine
    this.namespace = namespace || null
    // this.db = storageEngine.datastore
    this.channels = channels(web3, storageEngine, namespace)
    this.tokens = tokens(storageEngine, namespace)
    this.payments = payments(storageEngine, namespace)
  }

  close (): Promise<void> {
    return this.engine.close()
  }
}

/**
 * Build an instance of Storage.
 */
export const build = (web3: Web3, path: string, namespace: string | null = null, inMemoryOnly?: boolean, engineName?: string | Engine): Storage => {
  return new Storage(web3, path, namespace, inMemoryOnly, engineName)
}
