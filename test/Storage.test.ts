import * as Web3 from 'web3'
import * as expect from 'expect'
import Storage from '../lib/Storage'
import EngineNedb from '../lib/storage/nedb/EngineNedb'
import NedbChannelsDatabase from '../lib/storage/nedb/NedbChannelsDatabase'
import NedbTokensDatabase from '../lib/storage/nedb/NedbTokensDatabase'
import NedbPaymentsDatabase from '../lib/storage/nedb/NedbPaymentsDatabase'
import ChannelContract from '../lib/ChannelContract'
import EngineMongo from '../lib/storage/mongo/EngineMongo'
import MongoChannelsDatabase from '../lib/storage/mongo/MongoChannelsDatabase'
import MongoTokensDatabase from '../lib/storage/mongo/MongoTokensDatabase'
import MongoPaymentsDatabase from '../lib/storage/mongo/MongoPaymentsDatabase'
import EnginePostgres from '../lib/storage/postgresql/EnginePostgres'
import PostgresChannelsDatabase from '../lib/storage/postgresql/PostgresChannelsDatabase'
import PostgresTokensDatabase from '../lib/storage/postgresql/PostgresTokensDatabase'
import PostgresPaymentsDatabase from '../lib/storage/postgresql/PostgresPaymentsDatabase'

describe('Storage', () => {
  let channelContract = new ChannelContract(new Web3())

  context('for Nedb', async () => {
    let url = 'nedb://'

    specify('provide Nedb databases', async () => {
      let storage = await Storage.build(url, channelContract)
      expect(storage.engine instanceof EngineNedb).toBeTruthy()
      expect(storage.channelsDatabase instanceof NedbChannelsDatabase).toBeTruthy()
      expect(storage.tokensDatabase instanceof NedbTokensDatabase).toBeTruthy()
      expect(storage.paymentsDatabase instanceof NedbPaymentsDatabase).toBeTruthy()
    })
  })

  context('for Mongo', async () => {
    let url = 'mongo://'

    specify('provide Mongo databases', async () => {
      let storage = await Storage.build(url, channelContract)
      expect(storage.engine instanceof EngineMongo).toBeTruthy()
      expect(storage.channelsDatabase instanceof MongoChannelsDatabase).toBeTruthy()
      expect(storage.tokensDatabase instanceof MongoTokensDatabase).toBeTruthy()
      expect(storage.paymentsDatabase instanceof MongoPaymentsDatabase).toBeTruthy()
    })
  })

  context('for Postgresql', async () => {
    let url = 'postgresql://'

    specify('provide Postgresql databases', async () => {
      let storage = await Storage.build(url, channelContract)
      expect(storage.engine instanceof EnginePostgres).toBeTruthy()
      expect(storage.channelsDatabase instanceof PostgresChannelsDatabase).toBeTruthy()
      expect(storage.tokensDatabase instanceof PostgresTokensDatabase).toBeTruthy()
      expect(storage.paymentsDatabase instanceof PostgresPaymentsDatabase).toBeTruthy()
    })
  })
})
