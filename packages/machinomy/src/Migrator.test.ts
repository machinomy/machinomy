import * as fs from 'fs'
import EngineSqlite from './storage/sqlite/EngineSqlite'
import * as support from './support'
import expect = require('expect')

const DBMigrate = require('db-migrate')

function showMigrationsInFolder () {
  let result: string[] = []
  const listOfFiles: string[] = fs.readdirSync(__dirname + '/../migrations/')
  console.log('debug::' + __dirname + '/../migrations/')
  for (let filename of listOfFiles) {
    const isDir = fs.statSync(__dirname + '/../migrations/' + filename).isDirectory()
    if (!isDir) {
      result.push(filename.slice(0, -3))
    }
  }
  result.sort()
  console.log('debug::DB migration files: ' + JSON.stringify(result))
}

describe('sqlite migrator', () => {
  let engine: EngineSqlite
  let dbmigrate: any

  function showMigrationsInDB () {
    // tslint:disable-next-line:no-floating-promises
    engine.connect().then(() => engine.exec(async (client: any) => {
      let rows = await client.all('SELECT name FROM migrations ORDER BY name ASC')
      const names: string[] = rows
      let result: string[] = []
      for (let migrationName in names) {
        result.push(migrationName.substring(1))
      }
      console.log('IN DB: ' + result)
    }))
  }

  before(() => {
    return support.tmpFileName().then(filename => {
      filename = 'test.sqlite3' // !!!
      const dbMigrateConfig = {
        config: {
          'defaultEnv': 'testEnvSet',
          'testEnvSet': {
            'driver': 'sqlite3',
            'filename': filename
          }
        }
      }
      engine = new EngineSqlite(filename, dbMigrateConfig)
      // tslint:disable-next-line:no-floating-promises
      engine.connect().then(() =>
        engine.exec((client: any) => client.run('CREATE TABLE IF NOT EXISTS migrations(id INTEGER, name TEXT, run_on TEXT);')).then(() => {
          dbmigrate = DBMigrate.getInstance(true, dbMigrateConfig)
          dbmigrate.up()
          showMigrationsInFolder()
          showMigrationsInDB()
        })
      )
    })
  })

  after(() => {
    return engine.close()
  })

  afterEach(() => {
    // return engine.drop()
  })

  describe('silent behaviour', () => {
    it('get Available Migrations In Folder', async () => {
      let listOfMigrations = await engine.migrate().retrieveInFolderMigrationList()
      console.log(listOfMigrations)
    })

    it('all migrations synced', async () => {
      let listOfMigrations = await engine.migrate().retrieveInFolderMigrationList()
      let listOfUpMigrations = await engine.migrate().retrieveUpMigrationList()
      if (listOfMigrations.length === listOfUpMigrations.length) {
        expect(await engine.migrate().isLatest() === true)
      }
      console.log(listOfMigrations)
      console.log(listOfUpMigrations)
    })

    it('not all migrations synced', async () => {
      let listOfMigrations = await engine.migrate().retrieveInFolderMigrationList()
      let listOfUpMigrations = await engine.migrate().retrieveUpMigrationList()
      if (listOfMigrations.length === listOfUpMigrations.length) {
        expect(await engine.migrate().isLatest() === true)
      }
      console.log(listOfMigrations)
      console.log(listOfUpMigrations)

      await removeLastRowFromMigrationsTable()

      expect(await engine.migrate().isLatest() === false)

      await engine.migrate().sync()

      expect(await engine.migrate().isLatest() === true)
    })
  })

  // function removeFirstRowFromMigrationsTable (): Promise<void> {
  //   return engine.connect().then(() =>
  //     engine.exec((client: any) => client.run('DELETE FROM migrations WHERE id = 0'))
  //   )
  // }

  function removeLastRowFromMigrationsTable (): Promise<void> {
    return engine.connect().then(() =>
      engine.exec((client: any) => client.run('DELETE FROM migrations WHERE ID=(SELECT MAX(id) FROM migrations)'))
    )
  }
})
