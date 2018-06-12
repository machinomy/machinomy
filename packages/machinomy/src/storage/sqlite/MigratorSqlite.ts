import IMigrator from '../IMigrator'
import EngineSqlite from './EngineSqlite'
import * as fs from 'fs'
const DBMigrate = require('db-migrate')
let dbmigrate: any
const LENGTH_OF_MIGRATION_NAME = 14

export default class MigratorSqlite implements IMigrator {
  engine: EngineSqlite

  constructor (engine: EngineSqlite, migrateOptions?: Object | string) {
    this.engine = engine
    if (migrateOptions) {
      dbmigrate = DBMigrate.getInstance(true, migrateOptions)
    } else {
      dbmigrate = DBMigrate.getInstance(true, { cwd: '../../../migrations', config: __dirname + '/../../../database.json' })
    }
  }

  isLatest (): Promise<boolean> {
    return new Promise(async (resolve) => {
      const commonIndex: number = await this.getCommonIndex()
      if (commonIndex === -1) {
        resolve(true)
      } else {
        resolve(false)
      }
    })
  }

  sync (n?: string): Promise<void> {
    return new Promise(async (resolve) => {
      if (n !== undefined) {
        if (n.length === LENGTH_OF_MIGRATION_NAME) {
          dbmigrate.sync(n)
        } else {
          console.error('DB migration name must have ' + LENGTH_OF_MIGRATION_NAME + ' chars. But got ' + n.length)
        }
      } else {
        dbmigrate.sync()
      }
      resolve()
    })
  }

  async getCommonIndex (): Promise<number> {
    const migrationsInDB = await this.retrieveUpMigrationList()
    const migrationsInFolder = await this.retrieveInFolderMigrationList()
    let commonIndex = -1
    for (let i = 0; i < migrationsInFolder.length; i++) {
      if (migrationsInDB[i] !== migrationsInFolder[i]) {
        commonIndex = i
        break
      }
    }

    return Promise.resolve(commonIndex)
  }

  retrieveUpMigrationList (): Promise<string[]> {
    return new Promise((resolve) => {
      // tslint:disable-next-line:no-floating-promises
      this.engine.exec((client: any) => client.all(
        'SELECT name FROM migrations ORDER BY name ASC'
      )).then((res: any) => {
        const names: string[] = res.map((element: any) => element['name'])
        let result: string[] = []
        for (let migrationName of names) {
          result.push(migrationName.substring(1))
        }
        resolve(result)
      })
    })
  }

  retrieveInFolderMigrationList (): Promise<string[]> {
    return new Promise(async (resolve) => {
      let result: string[] = []
      const listOfFiles: string[] = fs.readdirSync(__dirname + '/../../../migrations/')
      console.log('debug::' + __dirname + '/../../../migrations/')
      for (let filename of listOfFiles) {
        const isDir = fs.statSync(__dirname + '/../../../migrations/' + filename).isDirectory()
        if (!isDir) {
          result.push(filename.slice(0, -3))
        }
      }
      result.sort()
      console.log('debug::DB migration files: ' + JSON.stringify(result))
      resolve(result)
    })
  }
}
