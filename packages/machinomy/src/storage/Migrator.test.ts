import * as fs from 'fs'
import { Unidirectional } from '../../../contracts/lib'
import ChannelContract from '../ChannelContract'
import EngineSqlite from './sqlite/EngineSqlite'
import Storage from '../Storage'
import expect = require('expect')
import * as Web3 from 'web3'
import * as sinon from 'sinon'

const DBMigrate = require('db-migrate')

function showMigrationsInFolder () {
  let result: string[] = []
  const listOfFiles: string[] = fs.readdirSync(__dirname + '/../../migrations/')
  console.log('debug::' + __dirname + '/../../migrations/')
  for (let filename of listOfFiles) {
    const isDir = fs.statSync(__dirname + '/../../migrations/' + filename).isDirectory()
    if (!isDir) {
      result.push(filename.slice(0, -3))
    }
  }
  result.sort()
  console.log('debug::DB migration files: ' + JSON.stringify(result))
}

function retrieveInFolderMigrationList (): Promise<string[]> {
  return new Promise(async (resolve) => {
    let result: string[] = []
    const listOfFiles: string[] = fs.readdirSync(__dirname + '/../../migrations/')
    console.log(__dirname + '/../../migrations/')
    for (let filename of listOfFiles) {
      const isDir = fs.statSync(__dirname + '/../../migrations/' + filename).isDirectory()
      if (!isDir) {
        result.push(filename.slice(0, -3))
      }
    }
    result.sort()
    console.log('debug::DB migration files: ' + JSON.stringify(result))
    return resolve(result)
  })
}

describe('sqlite migrator', () => {
  let engine: EngineSqlite
  let dbmigrate: any
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

  before(async () => {
    let filename = 'test236.sqlite3' // await support.tmpFileName()

    storage = await Storage.build(`sqlite://${filename}`, channelContract)
    const dbMigrateConfig = {
      config: {
        defaultEnv: 'envSet',
        envSet: {
          driver: 'sqlite3',
          filename: filename
        }
      }
    }
    engine = new EngineSqlite(filename)
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

  beforeEach(() => {
    web3 = {
      currentProvider: {}
    } as Web3

    deployed = {} as any
    contractStub = sinon.stub(Unidirectional, 'contract')
    contractStub.withArgs(web3.currentProvider).returns({
      deployed: sinon.stub().resolves(Promise.resolve(deployed))
    })
    channelContract = new ChannelContract(web3)

  })

  afterEach(() => {
    contractStub.restore()
  })

  after(() => {
    return engine.close()
  })

  describe('common', () => {
    it('all migrations synced', async () => {
      let listOfMigrations = await retrieveInFolderMigrationList()
      let listOfUpMigrations = await retrieveUpMigrationList()
      if (listOfMigrations.length === listOfUpMigrations.length) {
        expect(await storage.migrator!.isLatest() === true)
      }
    }).timeout(3000)

    it('not all migrations synced', async () => {
      let listOfMigrations = await retrieveInFolderMigrationList()
      let listOfUpMigrations = await retrieveUpMigrationList()
      if (listOfMigrations.length === listOfUpMigrations.length) {
        expect(await storage.migrator!.isLatest() === true)
      }
      expect(await storage.migrator!.isLatest() === false)
    }).timeout(3000)

    it('trying to sync migrations', async () => {
      let listOfMigrations = await retrieveInFolderMigrationList()
      let listOfUpMigrations = await retrieveUpMigrationList()
      if (listOfMigrations.length === listOfUpMigrations.length) {
        expect(await storage.migrator!.isLatest() === true)
      }
      await removeLastRowFromMigrationsTable()
      expect(await storage.migrator!.isLatest() === false)
      await storage.migrator!.sync()
      expect(await storage.migrator!.isLatest() === true)
    }).timeout(3000)
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
        })
      })
    })
  }
})
