import { ConnectionString } from 'connection-string'
import Logger from '@machinomy/logger'
import * as files from '../../util/files'
import IMigrator from '../IMigrator'
import IEngine from '../IEngine'

const LENGTH_OF_MIGRATION_NAME = 14
const log = new Logger('migrator')

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

export default class Migrator implements IMigrator {
  engine: IEngine
  migrationsPath: string
  dbmigrate: any
  DBMigrate: any
  dbMigrateConfig: any
  dbmigrateImportFailure: boolean

  constructor (engine: IEngine, connectionString: string, migrationsPath: string) {
    this.engine = engine
    this.dbMigrateConfig = migrationConfig(connectionString)
    this.migrationsPath = migrationsPath
    if (this.migrationsPath.endsWith('/') !== true) {
      this.migrationsPath += '/'
    }
    this.dbmigrateImportFailure = false
  }

  async isLatest (): Promise<boolean> {
    await this.ensureDBMigrateInit()
    if (this.dbmigrateImportFailure) {
      log.warn('db-migrate wasn\'t imported correctly! Migrator does not work now. It\'s OK if you are using Machinomy in browser or against NeDB.')
      return true
    } else {
      return this.dbmigrate.check()
    }
  }

  async sync (n?: string): Promise<void> {
    await this.ensureDBMigrateInit()
    if (this.dbmigrateImportFailure) {
      log.warn('db-migrate wasn\'t imported correctly! Migrator does not work now. It\'s OK if you are using Machinomy in browser or against NeDB.')
      return
    } else {
      if (n !== undefined) {
        this.dbmigrate.sync(n)
      } else {
        const migrationsInFolder = await this.retrieveInFolderMigrationList()
        const lastMigrationInFolderName = migrationsInFolder[migrationsInFolder.length - 1].substring(0, LENGTH_OF_MIGRATION_NAME)
        this.dbmigrate.sync(lastMigrationInFolderName)
      }
    }
  }

  async retrieveInFolderMigrationList (): Promise<string[]> {
    let result: string[] = []
    const listOfFiles: string[] = await files.readdir(this.migrationsPath)
    for (let filename of listOfFiles) {
      let stat = await files.stat(this.migrationsPath + filename)
      const isDir = stat.isDirectory()
      if (!isDir) {
        result.push(filename.slice(0, -3))
      }
    }
    result.sort()
    return result
  }

  async ensureDBMigrateInit (): Promise<void> {
    try {
      this.DBMigrate = await import('db-migrate')
    } catch (error) {
      this.dbmigrateImportFailure = true
    } finally {
      this.dbmigrate = this.DBMigrate.getInstance(true, this.dbMigrateConfig)
    }
  }
}
