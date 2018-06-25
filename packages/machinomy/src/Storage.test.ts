import * as Web3 from 'web3'
import * as expect from 'expect'
import Storage from './Storage'
import EngineNedb from './storage/nedb/EngineNedb'
import NedbChannelsDatabase from './storage/nedb/NedbChannelsDatabase'
import NedbTokensDatabase from './storage/nedb/NedbTokensDatabase'
import NedbPaymentsDatabase from './storage/nedb/NedbPaymentsDatabase'
import ChannelContract from './ChannelContract'
import EnginePostgres from './storage/postgresql/EnginePostgres'
import PostgresChannelsDatabase from './storage/postgresql/PostgresChannelsDatabase'
import PostgresTokensDatabase from './storage/postgresql/PostgresTokensDatabase'
import PostgresPaymentsDatabase from './storage/postgresql/PostgresPaymentsDatabase'
import { Unidirectional } from '@machinomy/contracts'
import * as sinon from 'sinon'

describe('Storage', () => {
  let web3: Web3
  let deployed: any
  let contractStub: sinon.SinonStub
  let channelContract: ChannelContract

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
