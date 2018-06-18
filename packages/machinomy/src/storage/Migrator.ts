import IEngine from './IEngine'
import IMigrator from './IMigrator'
import * as fs from 'fs'
import { ConnectionString } from 'connection-string'
const DBMigrate = require('db-migrate')

let dbmigrate: any
const LENGTH_OF_MIGRATION_NAME = 14

export default class Migrator implements IMigrator {
  engine: IEngine
  migrationsPath: string

  constructor (engine: IEngine, connectionString: string, migrationsPath: string) {
    this.engine = engine
    const dbMigrateConfig = this.generateConfigObject(connectionString)
    dbmigrate = DBMigrate.getInstance(true, dbMigrateConfig)
    this.migrationsPath = migrationsPath
    if (this.migrationsPath.endsWith('/') !== true) {
      this.migrationsPath += '/'
    }
  }

  isLatest (): Promise<boolean> {
    return new Promise((resolve) => {
      return resolve(dbmigrate.check())
    })
  }

  sync (n?: string): Promise<void> {
    return new Promise(async (resolve) => {
      if (n !== undefined) {
        dbmigrate.sync(n)
      } else {
        const migrationsInFolder = await this.retrieveInFolderMigrationList()
        const lastMigrationInFolderName = migrationsInFolder[migrationsInFolder.length - 1].substring(0, LENGTH_OF_MIGRATION_NAME)
        dbmigrate.sync(lastMigrationInFolderName)
      }
      return resolve()
    })
  }

  retrieveInFolderMigrationList (): Promise<string[]> {
    return new Promise(async (resolve) => {
      let result: string[] = []
      const listOfFiles: string[] = fs.readdirSync(this.migrationsPath)
      console.log(this.migrationsPath)
      for (let filename of listOfFiles) {
        const isDir = fs.statSync(this.migrationsPath + filename).isDirectory()
        if (!isDir) {
          result.push(filename.slice(0, -3))
        }
      }
      result.sort()
      console.log('debug::DB migration files: ' + JSON.stringify(result))
      return resolve(result)
    })
  }

  generateConfigObject (connectionUrl: string) {
    const driversMap = new Map<string, string>()
    driversMap.set('postgres', 'pg')
    driversMap.set('sqlite', 'sqlite3')
    const connectionObject = new ConnectionString(connectionUrl)
    let result
    if (connectionObject.protocol! === 'postgres') {
      result = {
        config: {
          defaultEnv: 'envSet',
          envSet: {
            driver: `${driversMap.get(connectionObject.protocol!)}`,
            user: `${connectionObject.user}`,
            password: `${connectionObject.password}`,
            host: `${connectionObject.hostname}`,
            database: `${connectionObject.segments![0]}`
          }
        }
      }
    } else {
      result = {
        config: {
          defaultEnv: 'envSet',
          envSet: {
            driver: `${driversMap.get(connectionObject.protocol!)}`,
            filename: `${connectionObject.hostname}`
          }
        }
      }
    }
    return result
  }
}
