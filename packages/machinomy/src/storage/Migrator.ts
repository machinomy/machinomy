import IEngine from './IEngine'
import IMigrator from './IMigrator'
import * as fs from 'fs'
const DBMigrate = require('db-migrate')

let dbmigrate: any
const LENGTH_OF_MIGRATION_NAME = 14

export default class Migrator implements IMigrator {
  engine: IEngine
  migrationsPath: string

  constructor (engine: IEngine, connectionString: string, migrationsPath: string) {
    this.engine = engine
    process.env.DATABASE_URL = connectionString
    dbmigrate = DBMigrate.getInstance(true)
    this.migrationsPath = migrationsPath
  }

  isLatest (): Promise<boolean> {
    return new Promise(async (resolve) => {
      return resolve()
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

  retrieveUpMigrationList (): Promise<string[]> {
    return new Promise((resolve) => {
      // tslint:disable-next-line:no-floating-promises
      (this.engine as any).exec((client: any) => client.all(
        'SELECT name FROM migrations ORDER BY name ASC'
      )).then((res: any) => {
        const names: string[] = res.map((element: any) => element['name'])
        let result: string[] = []
        for (let migrationName of names) {
          result.push(migrationName.substring(1))
        }
        return resolve(result)
      })
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
}
