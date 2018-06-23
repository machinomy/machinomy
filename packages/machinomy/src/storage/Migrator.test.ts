import * as fs from 'fs'
import { Unidirectional } from '../../../contracts/lib'
import ChannelContract from '../ChannelContract'
import IEngine from './IEngine'
import Migrator from './Migrator'
import EnginePostgres from './postgresql/EnginePostgres'
import EngineSqlite from './sqlite/EngineSqlite'
import Storage from '../Storage'
import expect = require('expect')
import * as Web3 from 'web3'
import * as sinon from 'sinon'
import * as support from '../support'
import * as DBMigrate from 'db-migrate'

describe('Main', () => {
  let engine: IEngine & { exec<B> (fn: (client: any) => B): Promise<B>}
  let dbmigrate: DBMigrate.DBMigrate
  let storage: Storage
  let web3: Web3
  let deployed: any
  let contractStub: sinon.SinonStub
  let channelContract: ChannelContract
  let runSqlAll: any

  function retrieveInFolderMigrationList (): Promise<string[]> {
    return new Promise(async (resolve) => {
      let result: string[] = []
      let pathToRead = `${__dirname}/../../migrations/${process.env.DB_URL!.split('://')[0]}`
      const listOfFiles: string[] = fs.readdirSync(pathToRead)
      for (let filename of listOfFiles) {
        let pathToStat = `${__dirname}/../../migrations/${process.env.DB_URL!.split('://')[0]}/${filename}`
        const isDir = fs.statSync(pathToStat).isDirectory()
        if (!isDir) {
          result.push(filename.slice(0, -3))
        }
      }
      result.sort()
      return resolve(result)
    })
  }

  function retrieveUpMigrationList (): Promise<string[]> {
    return new Promise((resolve) => {
      // tslint:disable-next-line:no-floating-promises
      engine.exec((client: any) => {
        return runSqlAll('SELECT name FROM migrations ORDER BY name ASC')
      }).then((res: any) => {
        switch (process.env.DB_URL!.split('://')[0]) {
          case 'postgresql': {
            res = res.rows
            break
          }
        }
        const names: string[] = res.map((element: any) => element['name'])
        let result: string[] = []
        for (let migrationName of names) {
          result.push(migrationName.substring(1))
        }
        return resolve(result)
      })
    })
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

      storage = await Storage.build(process.env.DB_URL!, channelContract)
      let dbMigrateConfig: DBMigrate.InstanceOptions = Migrator.generateConfigObject(process.env.DB_URL!)
      switch (process.env.DB_URL!.split('://')[0]) {
        case 'sqlite': {
          engine = new EngineSqlite(filename)
          break
        }
        case 'postgresql': {
          engine = new EnginePostgres(process.env.DB_URL!)
          break
        }
        default:
          return resolve()
      }
      // tslint:disable-next-line:no-floating-promises
      engine.connect().then(() =>
        engine.exec(async (client: any) => {
          if (process.env.DB_URL!.split('://')[0] === 'sqlite') {
            runSqlAll = client.all.bind(client)
            await runSqlAll('CREATE TABLE migrations(id INTEGER, name TEXT, run_on TEXT)')
          } else if (process.env.DB_URL!.split('://')[0] === 'postgresql') {
            runSqlAll = client.query.bind(client)
          }
          dbmigrate = DBMigrate.getInstance(true, dbMigrateConfig)
          await dbmigrate.up()
          resolve()
        })
      )
    })
  })

  afterEach(() => {
    return new Promise(async (resolve) => {
      contractStub.restore()
      if (engine) {
        await engine.close()
      }
      resolve()
    })
  })

  describe('common', () => {
    it('all migrations synced', async (done) => {
      if (!engine) {
        return done()
      }
      const listOfMigrations = await retrieveInFolderMigrationList()
      const listOfUpMigrations = await retrieveUpMigrationList()
      if (listOfMigrations.length === listOfUpMigrations.length) {
        expect(await storage.migrator!.isLatest() === true)
      } else {
        expect(await storage.migrator!.isLatest() === false)
      }
    }).timeout(15000)

    it('not all migrations synced', async (done) => {
      if (!engine) {
        return done()
      }
      const listOfMigrations = await retrieveInFolderMigrationList()
      const listOfUpMigrations = await retrieveUpMigrationList()
      if (listOfMigrations.length === listOfUpMigrations.length) {
        await removeLastRowFromMigrationsTable()
      }
      expect(await storage.migrator!.isLatest() === false)
    }).timeout(15000)

    it('trying to sync migrations', async (done) => {
      if (!engine) {
        return done()
      }
      const listOfMigrations = await retrieveInFolderMigrationList()
      const listOfUpMigrations = await retrieveUpMigrationList()
      if (listOfMigrations.length === listOfUpMigrations.length) {
        expect(await storage.migrator!.isLatest() === true)
      }
      await removeLastRowFromMigrationsTable()
      expect(await storage.migrator!.isLatest() === false)
      await storage.migrator!.sync()
      expect(await storage.migrator!.isLatest() === true)
    }).timeout(15000)
  })

  function removeLastRowFromMigrationsTable (): Promise<void> {
    return engine.connect().then(() => {
      return dbmigrate.down(1).then(() => {
        console.log('successfully migrated 1 migrations down')
      })
    })
  }
})
