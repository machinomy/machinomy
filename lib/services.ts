import Web3 = require('web3')
import {ChannelContract} from './channel'
import ChannelsDatabase, {
  MongoChannelsDatabase, NedbChannelsDatabase,
  PostgresChannelsDatabase
} from './storages/channels_database'
import PaymentsDatabase, {MongoPaymentsDatabase, PostgresPaymentsDatabase, NedbPaymentsDatabase} from './storages/payments_database'
import {default as ChannelManager, ChannelManagerImpl} from './channel_manager'
import TokensDatabase, {
  MongoTokensDatabase, NedbTokensDatabase,
  PostgresTokensDatabase
} from './storages/tokens_database'
import {ClientImpl} from './client'
import {Transport} from './transport'
import {MachinomyOptions} from '../index'
import Engine, {EngineMongo, EngineNedb, EnginePostgres} from './engines/engine'
import {Registry} from './container'

export default function defaultRegistry(): Registry {
  const serviceRegistry = new Registry()

  serviceRegistry.bind('ChannelContract', (web3: Web3) => new ChannelContract(web3), ['Web3'])

  serviceRegistry.bind('ChannelManager',
    (
      account: string,
      web3: Web3,
      channelsDao: ChannelsDatabase,
      paymentsDao: PaymentsDatabase,
      tokensDao: TokensDatabase,
      channelContract: ChannelContract
    ) => new ChannelManagerImpl(account, web3, channelsDao, paymentsDao, tokensDao, channelContract),
    ['account', 'Web3', 'ChannelsDatabase', 'PaymentsDatabase', 'TokensDatabase', 'ChannelContract'])

  serviceRegistry.bind('Client', (transport: Transport, channelManager: ChannelManager) => {
    return new ClientImpl(transport, channelManager)
  }, ['Transport', 'ChannelManager'])

  serviceRegistry.bind('Transport', () => new Transport())

  serviceRegistry.bind('Engine', (options: MachinomyOptions): Engine => {
    if (options.engine === 'nedb' && !options.databaseFile) {
      throw new Error('No database file found.')
    }

    switch (options.engine) {
      case 'nedb':
        return new EngineNedb(options.databaseFile as string, false)
      case 'mongo':
        return new EngineMongo()
      case 'postgres':
        return new EnginePostgres()
    }

    if (typeof options.engine === 'object') {
      return options.engine
    }

    throw new Error(`Invalid engine: ${options.engine}.`)
  }, ['MachinomyOptions'])

  serviceRegistry.bind('ChannelsDatabase', (web3: Web3, engine: Engine, namespace: string): ChannelsDatabase => {
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
  }, ['Web3', 'Engine', 'namespace'])

  serviceRegistry.bind('PaymentsDatabase', (engine: Engine, namespace: string) => {
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
  }, ['Engine', 'namespace'])

  serviceRegistry.bind('TokensDatabase', (engine: Engine, namespace: string) => {
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
  }, ['Engine', 'namespace'])

  return serviceRegistry
}
