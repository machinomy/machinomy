import * as fs from 'fs'
import { Unidirectional } from '../../../contracts/lib'
import ChannelContract from '../ChannelContract'
import EngineSqlite from './sqlite/EngineSqlite'
import Storage from '../Storage'
import expect = require('expect')
import * as Web3 from 'web3'
import * as sinon from 'sinon'
import * as support from '../support'
import * as DBMigrate from 'db-migrate'

// tslint:disable-next-line:no-unused-variable
function showMigrationsInFolder () {
  let result: string[] = []
  const listOfFiles: string[] = fs.readdirSync(__dirname + '/../../migrations/')
  for (let filename of listOfFiles) {
    const isDir = fs.statSync(__dirname + '/../../migrations/' + filename).isDirectory()
    if (!isDir) {
      result.push(filename.slice(0, -3))
    }
  }
  result.sort()
}

function retrieveInFolderMigrationList (): Promise<string[]> {
  return new Promise(async (resolve) => {
    let result: string[] = []
    const listOfFiles: string[] = fs.readdirSync(__dirname + '/../../migrations/')
    for (let filename of listOfFiles) {
      const isDir = fs.statSync(__dirname + '/../../migrations/' + filename).isDirectory()
      if (!isDir) {
        result.push(filename.slice(0, -3))
      }
    }
    result.sort()
    return resolve(result)
  })
}

describe('sqlite migrator', () => {
  let engine: EngineSqlite
  let dbmigrate: DBMigrate.DBMigrate
  let storage: Storage
  let web3: Web3
  let deployed: any
  let contractStub: sinon.SinonStub
  let channelContract: ChannelContract

  function retrieveUpMigrationList (): Promise<string[]> {
    return new Promise((resolve) => {
      // tslint:disable-next-line:no-floating-promises
      engine.exec((client: any) => client.all(
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

  // tslint:disable-next-line:no-unused-variable
  function showMigrationsInDB () {
    // tslint:disable-next-line:no-floating-promises
    engine.connect().then(() => engine.exec(async (client: any) => {
      let rows = await client.all('SELECT name FROM migrations ORDER BY name ASC')
      const names: string[] = rows
      let result: string[] = []
      for (let migrationName in names) {
        result.push(migrationName.substring(1))
      }
    }))
  }

  beforeEach(async () => {
    return new Promise(async (resolve) => {
      web3 = {
        currentProvider: {}
      } as Web3

      deployed = {} as any
      contractStub = sinon.stub(Unidirectional, 'contract')
      contractStub.withArgs(web3.currentProvider).returns({
        deployed: sinon.stub().resolves(Promise.resolve(deployed))
      })
      channelContract = new ChannelContract(web3)

      const filename = await support.tmpFileName()
      console.log('Filename of DB is ' + filename)

      storage = await Storage.build(`sqlite://${filename}`, channelContract)
      const dbMigrateConfig: DBMigrate.InstanceOptions = {
        config: {
          defaultEnv: 'defaultSqlite',
          defaultSqlite: {
            driver: 'sqlite3',
            filename: filename
          }
        }
      }

      engine = new EngineSqlite(filename)
      // tslint:disable-next-line:no-floating-promises
      engine.connect().then(() =>
        engine.exec((client: any) => client.run('CREATE TABLE IF NOT EXISTS migrations(id INTEGER, name TEXT, run_on TEXT);')).then(async () => {
          dbmigrate = DBMigrate.getInstance(true, dbMigrateConfig)
          await dbmigrate.reset()
          await dbmigrate.up()
          // showMigrationsInFolder()
          // showMigrationsInDB()
          resolve()
        })
      )
    })
  })

  afterEach(() => {
    return new Promise(async (resolve) => {
      contractStub.restore()
      await engine.close()
      resolve()
    })
  })

  describe('common', () => {
    it('all migrations synced', async () => {
      const listOfMigrations = await retrieveInFolderMigrationList()
      const listOfUpMigrations = await retrieveUpMigrationList()
      if (listOfMigrations.length === listOfUpMigrations.length) {
        expect(await storage.migrator!.isLatest() === true)
      } else {
        expect(await storage.migrator!.isLatest() === false)
      }
    }).timeout(5000)

    it('not all migrations synced', async () => {
      const listOfMigrations = await retrieveInFolderMigrationList()
      const listOfUpMigrations = await retrieveUpMigrationList()
      if (listOfMigrations.length === listOfUpMigrations.length) {
        await removeLastRowFromMigrationsTable()
      }
      expect(await storage.migrator!.isLatest() === false)
    }).timeout(5000)

    it('trying to sync migrations', async () => {
      const listOfMigrations = await retrieveInFolderMigrationList()
      const listOfUpMigrations = await retrieveUpMigrationList()
      if (listOfMigrations.length === listOfUpMigrations.length) {
        expect(await storage.migrator!.isLatest() === true)
      }
      await removeLastRowFromMigrationsTable()
      expect(await storage.migrator!.isLatest() === false)
      await storage.migrator!.sync()
      expect(await storage.migrator!.isLatest() === true)
    }).timeout(5000)
  })

  // function removeFirstRowFromMigrationsTable (): Promise<void> {
  //   return engine.connect().then(() =>
  //     return engine.exec((client: any) => client.run('DELETE FROM migrations WHERE id = 0'))
  //   )
  // }

  function removeLastRowFromMigrationsTable (): Promise<void> {
    return engine.connect().then(() => {
      // tslint:disable-next-line:no-floating-promises
      return engine.exec((client: any) => client.get(
        'SELECT MAX(name) FROM migrations'
      )).then((res: any) => {
        return engine.exec((client: any) => {
          client.run(`DELETE FROM migrations WHERE name='${res['MAX(name)']}'`)
        }).then(() => {
          return dbmigrate.down(1).then(() => {
            console.log('successfully migrated 1 migrations down')
          })
        })
      })
    })
  }
})
