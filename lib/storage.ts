import * as channel from './channel'
import { Log } from 'typescript-logger'
import Promise = require('bluebird')
import _ = require('lodash')
import Datastore = require('nedb')
import Web3 = require('web3')
import { ChannelId, PaymentChannel, PaymentChannelJSON } from './channel'
import Payment from './Payment'

import Engine from './engines/engine'
import EngineMongo from './engines/engine_mongo'
import EngineNedb from './engines/engine_nedb'

import ChannelsDatabase from './storages/channels_database'
import TokensDatabase from './storages/tokens_database'
import PaymentsDatabase from './storages/payments_database'

import * as configuration from './configuration'

const log = Log.create('storage')
const defaultEngineName = 'nedb'

const namespaced = (namespace: string|null|undefined, kind: string): string => {
  let result = kind
  if (namespace) {
    result = namespace + ':' + kind
  }
  return result
}

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
export const engine = (path: string, inMemoryOnly: boolean = false, engine_name: string = defaultEngineName): Engine => {
  if (engine_name === 'nedb') {
    return new EngineNedb(path, inMemoryOnly)
  } else if (engine_name === 'mongo') {
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

  constructor (web3: Web3, path: string, namespace: string|null, inMemoryOnly?: boolean, engine_name: string = defaultEngineName) {
    let storageEngine = engine(path, inMemoryOnly, engine_name)
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
export const build = (web3: Web3, path: string, namespace: string | null = null, inMemoryOnly?: boolean, engine_name: string = defaultEngineName): Storage => {
  return new Storage(web3, path, namespace, inMemoryOnly, engine_name)
}
