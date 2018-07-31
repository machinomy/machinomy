import IEngine from './IEngine'
import IMigrator from './IMigrator'
import { ConnectionString } from 'connection-string'
import * as DBMigrate from 'db-migrate'
import Logger from '@machinomy/logger'
import * as files from '../util/files'
import Indexed from '../util/Indexed'

export function sqliteMigrationConfig (c: ConnectionString) {
  return {
    cmdOptions: {
      'migrations-dir': './migrations/sqlite'
    },
    config: {
      defaultEnv: 'defaultSqlite',
      defaultSqlite: {
        driver: 'sqlite3',
        filename: `${c.hostname}`
      }
    }
  }
}

export function postgresqlMigrationConfig (c: ConnectionString) {
  return {
    cmdOptions: {
      'migrations-dir': './migrations/postgresql'
    },
    config: {
      defaultEnv: 'defaultPg',
      defaultPg: {
        driver: 'pg',
        user: `${c.user}`,
        password: `${c.password}`,
        host: `${c.hostname}`,
        database: `${c.segments![0]}`
      }
    }
  }
}

export function migrationConfig (connectionUrl: string) {
  const c = new ConnectionString(connectionUrl)
  switch (c.protocol) {
    case 'sqlite':
      return sqliteMigrationConfig(c)
    case 'postgresql':
      return postgresqlMigrationConfig(c)
    default:
      throw new Error(`Database protocol '${c.protocol}' is not supported`)
  }
}

const log = new Logger('migrator')

async function lastMigrationNumber (migrationsPath: string): Promise<string | undefined> {
  let allFiles = await files.readdir(migrationsPath)
  let migrations = allFiles.reduce((acc, filename) => {
    let match = filename.match(/^(\d+)[\w-]+\.js$/)
    return match ? acc.concat([match[1]]) : acc
  }, [] as Array<string>).sort()
  return migrations[migrations.length - 1]
}

export default class Migrator implements IMigrator {
  engine: IEngine
  dbmigrate: DBMigrate.DBMigrate
  migrationsPath: string

  constructor (engine: IEngine, migrationConfig: DBMigrate.InstanceOptions) {
    this.engine = engine
    log.debug('migrator config %o', migrationConfig)
    this.migrationsPath = (migrationConfig.cmdOptions as Indexed<string>)['migrations-dir']
    this.dbmigrate = DBMigrate.getInstance(true, migrationConfig)
  }

  async isLatest (): Promise<boolean> {
    let r = await this.dbmigrate.check()
    r ? log.info('Latest migration is applied') : log.info('Have migrations to be applied')
    return this.dbmigrate.check()
  }

  async sync (n?: string): Promise<void> {
    let destination = n ? n : await lastMigrationNumber(this.migrationsPath)
    log.info('Syncing migrations till %s', destination)
    return this.dbmigrate.sync(destination)
  }
}
