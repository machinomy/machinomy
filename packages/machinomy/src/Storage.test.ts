import * as Web3 from 'web3'
import * as expect from 'expect'
import ChannelInflator from './ChannelInflator'
import Storage from './Storage'
import EngineNedb from './storage/nedb/EngineNedb'
import NedbChannelsDatabase from './storage/nedb/NedbChannelsDatabase'
import NedbTokensDatabase from './storage/nedb/NedbTokensDatabase'
import NedbPaymentsDatabase from './storage/nedb/NedbPaymentsDatabase'
import EnginePostgres from './storage/postgresql/EnginePostgres'
import PostgresChannelsDatabase from './storage/postgresql/PostgresChannelsDatabase'
import PostgresTokensDatabase from './storage/postgresql/PostgresTokensDatabase'
import PostgresPaymentsDatabase from './storage/postgresql/PostgresPaymentsDatabase'
import { Unidirectional } from '@machinomy/contracts'
import * as sinon from 'sinon'
import EngineSqlite from './storage/sqlite/EngineSqlite'
import SqliteChannelsDatabase from './storage/sqlite/SqliteChannelsDatabase'
import SqliteTokensDatabase from './storage/sqlite/SqliteTokensDatabase'
import SqlitePaymentsDatabase from './storage/sqlite/SqlitePaymentsDatabase'

describe('Storage', () => {
  let web3: Web3
  let deployed: any
  let contractStub: sinon.SinonStub
  let inflator = {} as ChannelInflator

  beforeEach(() => {
    web3 = {
      currentProvider: {}
    } as Web3

    deployed = {} as any
    contractStub = sinon.stub(Unidirectional, 'contract')
    contractStub.withArgs(web3.currentProvider).returns({
      deployed: sinon.stub().resolves(Promise.resolve(deployed))
    })
  })

  afterEach(() => {
    contractStub.restore()
  })

  context('for Nedb', async () => {
    const url = 'nedb://'

    specify('provide Nedb databases', async () => {
      const storage = await Storage.build(url, inflator)
      expect(storage.engine instanceof EngineNedb).toBeTruthy()
      expect(storage.channelsDatabase instanceof NedbChannelsDatabase).toBeTruthy()
      expect(storage.tokensDatabase instanceof NedbTokensDatabase).toBeTruthy()
      expect(storage.paymentsDatabase instanceof NedbPaymentsDatabase).toBeTruthy()
    })
  })

  context('for Sqlite', async () => {
    const url = 'sqlite://'

    specify('provide Sqlite databases', async () => {
      const storage = await Storage.build(url, inflator)
      expect(storage.engine instanceof EngineSqlite).toBeTruthy()
      expect(storage.channelsDatabase instanceof SqliteChannelsDatabase).toBeTruthy()
      expect(storage.tokensDatabase instanceof SqliteTokensDatabase).toBeTruthy()
      expect(storage.paymentsDatabase instanceof SqlitePaymentsDatabase).toBeTruthy()
    })
  })

  context('for Postgresql', async () => {
    const url = 'postgresql://host/database'

    specify('provide Postgresql databases', async () => {
      const storage = await Storage.build(url, inflator)
      expect(storage.engine instanceof EnginePostgres).toBeTruthy()
      expect(storage.channelsDatabase instanceof PostgresChannelsDatabase).toBeTruthy()
      expect(storage.tokensDatabase instanceof PostgresTokensDatabase).toBeTruthy()
      expect(storage.paymentsDatabase instanceof PostgresPaymentsDatabase).toBeTruthy()
    })
  })
})
