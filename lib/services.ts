import Web3 = require('web3')
import ChannelsDatabase, {
  MongoChannelsDatabase, NedbChannelsDatabase,
  PostgresChannelsDatabase
} from './storages/channels_database'
import PaymentsDatabase, { MongoPaymentsDatabase, PostgresPaymentsDatabase, NedbPaymentsDatabase } from './storages/payments_database'
import { ChannelManager, ChannelManagerImpl } from './channel_manager'
import TokensDatabase, {
  MongoTokensDatabase, NedbTokensDatabase,
  PostgresTokensDatabase
} from './storages/tokens_database'
import { ClientImpl } from './client'
import { Transport } from './transport'
import { MachinomyOptions } from '../MachinomyOptions'
import Engine, { EngineMongo, EngineNedb, EnginePostgres } from './engines/engine'
import { Registry } from './container'
import ChainManager from './chain_manager'
import ChannelContract from './channel_contract'
import PaymentManager from './payment_manager'

export default function defaultRegistry (): Registry {
  const serviceRegistry = new Registry()

  serviceRegistry.bind('ChainManager', (web3: Web3) => new ChainManager(web3), ['Web3'])

  serviceRegistry.bind('ChannelContract', (web3: Web3) => new ChannelContract(web3), ['Web3'])

  serviceRegistry.bind('ChannelManager',
    (
      account: string,
      web3: Web3,
      channelsDao: ChannelsDatabase,
      paymentsDao: PaymentsDatabase,
      tokensDao: TokensDatabase,
      channelContract: ChannelContract,
      paymentManager: PaymentManager,
      machinomyOptions: MachinomyOptions
    ) => new ChannelManagerImpl(account, web3, channelsDao, paymentsDao, tokensDao, channelContract, paymentManager, machinomyOptions),
    ['account', 'Web3', 'ChannelsDatabase', 'PaymentsDatabase', 'TokensDatabase', 'ChannelContract', 'PaymentManager', 'MachinomyOptions'])

  serviceRegistry.bind('Client', (transport: Transport, channelManager: ChannelManager) => {
    return new ClientImpl(transport, channelManager)
  }, ['Transport', 'ChannelManager'])

  serviceRegistry.bind('Transport', () => new Transport())

  serviceRegistry.bind('Engine', (options: MachinomyOptions): Engine => {
    const splits = options.databaseUrl.split('://')

    switch (splits[0]) {
      case 'nedb':
        return new EngineNedb(splits[1], false)
      case 'mongodb':
        return new EngineMongo(options.databaseUrl)
      case 'postgresql':
        return new EnginePostgres(options.databaseUrl)
    }

    throw new Error(`Invalid engine: ${splits[0]}.`)
  }, ['MachinomyOptions'])

  serviceRegistry.bind('ChannelsDatabase', (engine: Engine, channelContract: ChannelContract, namespace: string): ChannelsDatabase => {
    if (engine instanceof EngineMongo) {
      return new MongoChannelsDatabase(engine, channelContract, namespace)
    }

    if (engine instanceof EnginePostgres) {
      return new PostgresChannelsDatabase(engine, channelContract, namespace)
    }

    if (engine instanceof EngineNedb) {
      return new NedbChannelsDatabase(engine, channelContract, namespace)
    }

    throw new Error('Invalid engine.')
  }, ['Engine', 'ChannelContract', 'namespace'])

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

  serviceRegistry.bind('PaymentManager',
    (chainManager: ChainManager, channelContract: ChannelContract, options: MachinomyOptions) => new PaymentManager(chainManager, channelContract, options),
    ['ChainManager', 'ChannelContract', 'MachinomyOptions'])

  return serviceRegistry
}
