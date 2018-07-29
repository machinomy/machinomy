import ChannelInflator from './ChannelInflator'
import IMigrator from './storage/IMigrator'
import ITokensDatabase from './storage/ITokensDatabase'
import IPaymentsDatabase from './storage/IPaymentsDatabase'
import IChannelsDatabase from './storage/IChannelsDatabase'
import ChannelContract from './ChannelContract'
import IEngine from './storage/IEngine'
import Migrator from './storage/Migrator'
import { resolve as resolvePath } from 'path'

export interface Storage {
  engine: IEngine,
  tokensDatabase: ITokensDatabase,
  paymentsDatabase: IPaymentsDatabase,
  channelsDatabase: IChannelsDatabase,
  migrator: IMigrator | undefined
}

export namespace Storage {
  export function build (databaseUrl: string, inflator: ChannelInflator): Promise<Storage> {
    const splits = databaseUrl.split('://')
    const protocol = splits[0]
    const namespace = 'shared' // TODO Namespace

    switch (protocol) {
      case 'nedb':
        return buildNedb(splits[1], inflator, namespace)
      case 'postgresql':
        return buildPostgres(databaseUrl, inflator, namespace)
      case 'sqlite':
        return buildSqlite(databaseUrl, inflator, namespace)
      default:
        throw new Error(`Unsupported database protocol: ${protocol}`)
    }
  }

  async function buildNedb (databaseUrl: string, inflator: ChannelInflator, namespace: string): Promise<Storage> {
    let EngineNedb = (await import('./storage/nedb/EngineNedb')).default
    let NedbTokensDatabase = (await import('./storage/nedb/NedbTokensDatabase')).default
    let NedbPaymentsDatabase = (await import('./storage/nedb/NedbPaymentsDatabase')).default
    let NedbChannelsDatabase = (await import('./storage/nedb/NedbChannelsDatabase')).default

    let engine = new EngineNedb(databaseUrl, false)
    return {
      engine: engine,
      tokensDatabase: new NedbTokensDatabase(engine, namespace),
      paymentsDatabase: new NedbPaymentsDatabase(engine, namespace),
      channelsDatabase: new NedbChannelsDatabase(engine, inflator, namespace),
      migrator: undefined
    }
  }

  async function buildSqlite (databaseUrl: string, inflator: ChannelInflator, namespace: string): Promise<Storage> {
    let EngineSqlite = (await import('./storage/sqlite/EngineSqlite')).default
    let SqliteTokensDatabase = (await import('./storage/sqlite/SqliteTokensDatabase')).default
    let SqlitePaymentsDatabase = (await import('./storage/sqlite/SqlitePaymentsDatabase')).default
    let SqliteChannelsDatabase = (await import('./storage/sqlite/SqliteChannelsDatabase')).default

    let engine = new EngineSqlite(databaseUrl)
    return {
      engine: engine,
      tokensDatabase: new SqliteTokensDatabase(engine, namespace),
      paymentsDatabase: new SqlitePaymentsDatabase(engine, namespace),
      channelsDatabase: new SqliteChannelsDatabase(engine, inflator, namespace),
      migrator: new Migrator(engine, databaseUrl, resolvePath('migrations/sqlite/'))
    }
  }

  async function buildPostgres (databaseUrl: string, inflator: ChannelInflator, namespace: string): Promise<Storage> {
    let EnginePostgres = (await import('./storage/postgresql/EnginePostgres')).default
    let PostgresTokensDatabase = (await import('./storage/postgresql/PostgresTokensDatabase')).default
    let PostgresPaymentsDatabase = (await import('./storage/postgresql/PostgresPaymentsDatabase')).default
    let PostgresChannelsDatabase = (await import('./storage/postgresql/PostgresChannelsDatabase')).default

    let engine = new EnginePostgres(databaseUrl)

    return {
      engine: engine,
      tokensDatabase: new PostgresTokensDatabase(engine, namespace),
      paymentsDatabase: new PostgresPaymentsDatabase(engine, namespace),
      channelsDatabase: new PostgresChannelsDatabase(engine, inflator, namespace),
      migrator: new Migrator(engine, databaseUrl, resolvePath('migrations/postgresql/'))
    }
  }
}

export default Storage
