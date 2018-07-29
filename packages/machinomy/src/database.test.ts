import * as sinon from 'sinon'
import * as Web3 from 'web3'
import ChannelInflator from './ChannelInflator'
import * as support from './support'
import ChannelId from './ChannelId'
import * as BigNumber from 'bignumber.js'
import { PaymentChannel } from './PaymentChannel'
import ChannelContract from './ChannelContract'
import expectsRejection from './util/expects_rejection'
import IEngine from './storage/IEngine'
import EngineNedb from './storage/nedb/EngineNedb'
import EnginePostgres from './storage/postgresql/EnginePostgres'
import AbstractChannelsDatabase from './storage/AbstractChannelsDatabase'
import NedbChannelsDatabase from './storage/nedb/NedbChannelsDatabase'
import PostgresChannelsDatabase from './storage/postgresql/PostgresChannelsDatabase'
import IPaymentsDatabase from './storage/IPaymentsDatabase'
import NedbPaymentsDatabase from './storage/nedb/NedbPaymentsDatabase'
import PostgresPaymentsDatabase from './storage/postgresql/PostgresPaymentsDatabase'
import PostgresTokensDatabase from './storage/postgresql/PostgresTokensDatabase'
import ITokensDatabase from './storage/ITokensDatabase'
import NedbTokensDatabase from './storage/nedb/NedbTokensDatabase'
import EngineSqlite from './storage/sqlite/EngineSqlite'
import SqliteChannelsDatabase from './storage/sqlite/SqliteChannelsDatabase'
import SqlitePaymentsDatabase from './storage/sqlite/SqlitePaymentsDatabase'
import SqliteTokensDatabase from './storage/sqlite/SqliteTokensDatabase'
import ChannelEthContract from './ChannelEthContract'
import ChannelTokenContract from './ChannelTokenContract'

const expect = require('expect')

const engineName = process.env.ENGINE_NAME || 'nedb'

function buildEngine (filename: string): IEngine {
  switch (engineName) {
    case 'nedb':
      return new EngineNedb(filename, false)
    case 'postgresql':
      return new EnginePostgres()
    case 'sqlite':
      return new EngineSqlite(filename)
    default:
      throw new Error(`Invalid engine ${engineName}.`)
  }
}

function buildDatabases (engine: IEngine, inflator: ChannelInflator): [AbstractChannelsDatabase<IEngine>, IPaymentsDatabase, ITokensDatabase] {
  if (engine instanceof EngineNedb) {
    return [new NedbChannelsDatabase(engine, inflator, null), new NedbPaymentsDatabase(engine, null), new NedbTokensDatabase(engine, null)]
  }

  if (engine instanceof EnginePostgres) {
    return [new PostgresChannelsDatabase(engine, inflator, null), new PostgresPaymentsDatabase(engine, null), new PostgresTokensDatabase(engine, null)]
  }

  if (engine instanceof EngineSqlite) {
    return [new SqliteChannelsDatabase(engine, inflator, null), new SqlitePaymentsDatabase(engine, null), new SqliteTokensDatabase(engine, null)]
  }

  throw new Error('Invalid engine.')
}

describe('storage', () => {
  let engine: IEngine

  let channels: AbstractChannelsDatabase<IEngine>

  let tokens: ITokensDatabase

  let fakeContract: ChannelContract

  before(() => {
    return support.tmpFileName().then(filename => {
      engine = buildEngine(filename)

      fakeContract = {} as ChannelContract
      fakeContract.channelById = sinon.stub()
      fakeContract.getState = (): Promise<number> => {
        return Promise.resolve(0)
      }

      (fakeContract.channelById as sinon.SinonStub).resolves([null, null, '2'])

      const channelEthContract = new ChannelEthContract({} as Web3)
      const channelTokenContract = new ChannelTokenContract({} as Web3)
      const inflator = new ChannelInflator(channelEthContract, channelTokenContract)

      const databases = buildDatabases(engine, inflator)
      channels = databases[0]
      tokens = databases[2]
    })
  })

  after(() => {
    return engine.close()
  })

  afterEach(() => {
    return engine.drop()
  })

  describe('ChannelsDatabase', () => {
    describe('#updateState', () => {
      it('updates the state value', async () => {
        const id = ChannelId.random().toString()

        await channels.save(new PaymentChannel('sender', 'receiver', id, new BigNumber.BigNumber(69), new BigNumber.BigNumber(8), 0, ''))
        await channels.updateState(id, 2)
        let chan = await channels.firstById(id)
        expect(chan!.state).toBe(2)
      })
    })

    describe('#spend', () => {
      it('update spent amount', () => {
        const channelId = ChannelId.build('0xdeadbeaf')
        const hexChannelId = channelId.toString()
        const paymentChannel = new PaymentChannel('sender', 'receiver', hexChannelId, new BigNumber.BigNumber(10), new BigNumber.BigNumber(0), undefined, '')
        const spent = new BigNumber.BigNumber(33)

        return channels.save(paymentChannel).then(() => {
          return channels.spend(channelId, spent)
        }).then(() => {
          return channels.firstById(channelId)
        }).then((updated: any) => {
          expect(updated.channelId).toBe(hexChannelId)
          expect(updated.spent).toEqual(spent)
        })
      })
    })

    describe('#save and #firstById', () => {
      it('match', () => {
        const channelId = ChannelId.build('0xdeadbeaf')
        const hexChannelId = channelId.toString()
        const paymentChannel = new PaymentChannel('sender', 'receiver', hexChannelId, new BigNumber.BigNumber(10), new BigNumber.BigNumber(0), 0, '')

        return channels.save(paymentChannel).then(() => {
          return channels.firstById(channelId)
        }).then((saved: any) => {
          expect(saved.toString()).toBe(paymentChannel.toString())
        })
      })
    })

    describe('#firstById', () => {
      it('return null if not found', () => {
        const channelId = ChannelId.random()
        return channels.firstById(channelId).then((found: any) => {
          expect(found).toBeNull()
        })
      })
    })

    describe('#saveOrUpdate', () => {
      it('save new PaymentChannel', () => {
        const channelId = ChannelId.random()
        const hexChannelId = channelId.toString()
        const paymentChannel = new PaymentChannel('sender', 'receiver', hexChannelId, new BigNumber.BigNumber(10), new BigNumber.BigNumber(0), 0, '')
        return channels.firstById(channelId).then((found: any) => {
          expect(found).toBeNull()
        }).then(() => {
          return channels.saveOrUpdate(paymentChannel)
        }).then(() => {
          return channels.firstById(channelId)
        }).then((found: any) => {
          expect(JSON.stringify(found)).toBe(JSON.stringify(paymentChannel))
        })
      })

      it('update spent value on existing PaymentChannel', () => {
        const channelId = ChannelId.random()
        const hexChannelId = channelId.toString()
        const spent = new BigNumber.BigNumber(5)
        const paymentChannel = new PaymentChannel('sender', 'receiver', hexChannelId, new BigNumber.BigNumber(10), new BigNumber.BigNumber(0), undefined, '')
        const updatedPaymentChannel = new PaymentChannel('sender', 'receiver', hexChannelId, new BigNumber.BigNumber(10), spent, undefined, '')
        return channels.save(paymentChannel).then(() => {
          return channels.saveOrUpdate(updatedPaymentChannel)
        }).then(() => {
          return channels.firstById(channelId)
        }).then((found: any) => {
          expect(found.spent).toEqual(spent)
        })
      })
    })

    describe('#deposit', () => {
      it('updates the channel value to the sum of the old value and new', () => {
        const channelId = ChannelId.random()
        const hexChannelId = channelId.toString()
        const newValue = new BigNumber.BigNumber(15)
        const paymentChannel = new PaymentChannel('sender', 'receiver', hexChannelId, new BigNumber.BigNumber(10), new BigNumber.BigNumber(0), undefined, '')
        return channels.save(paymentChannel).then(() => {
          return channels.deposit(hexChannelId, new BigNumber.BigNumber(5))
        }).then(() => {
          return channels.firstById(channelId)
        }).then((found: any) => {
          expect(found.value).toEqual(newValue)
        })
      })

      it('throws an error if the channel does not exist', () => {
        return expectsRejection(channels.deposit('123-abc', new BigNumber.BigNumber(10)))
      })
    })
  })

  describe('#all', () => {
    it('return all the channels', () => {
      const channelId = ChannelId.random()
      const hexChannelId = channelId.toString()
      const paymentChannel = new PaymentChannel('sender', 'receiver', hexChannelId, new BigNumber.BigNumber(10), new BigNumber.BigNumber(0), undefined, '')
      return channels.save(paymentChannel).then(() => {
        return channels.all()
      }).then((found: PaymentChannel[]) => {
        expect(found.length).toBe(1)
        const foundChannelId = found[0].channelId
        expect(foundChannelId).toBe(hexChannelId)
      })
    })
  })

  describe('#allSettling', () => {
    it('returns all settling channels', () => {
      const channelId1 = ChannelId.random()
      const channelId2 = ChannelId.random()
      const hexChannelId1 = channelId1.toString()
      const hexChannelId2 = channelId2.toString()
      const paymentChannel1 = new PaymentChannel('sender', 'receiver', hexChannelId1, new BigNumber.BigNumber(10), new BigNumber.BigNumber(0), 0, '')
      const paymentChannel2 = new PaymentChannel('sender', 'receiver', hexChannelId2, new BigNumber.BigNumber(10), new BigNumber.BigNumber(0), 1, '')

      const getState = fakeContract.getState as sinon.SinonStub
      getState.withArgs(hexChannelId2).resolves(1)

      return Promise.all([
        channels.save(paymentChannel1),
        channels.save(paymentChannel2)
      ]).then(() => {
        return channels.allSettling()
      }).then(found => {
        expect(found.length).toBe(1)
        expect(found[0].channelId).toBe(paymentChannel2.channelId)
      })
    })
  })

  describe('#allOpen', () => {
    it('returns all open channels', () => {
      const channelId1 = ChannelId.random()
      const channelId2 = ChannelId.random()
      const channelId3 = ChannelId.random()
      const hexChannelId1 = channelId1.toString()
      const hexChannelId2 = channelId2.toString()
      const hexChannelId3 = channelId3.toString()
      const paymentChannel1 = new PaymentChannel('sender', 'receiver', hexChannelId1, new BigNumber.BigNumber(10), new BigNumber.BigNumber(0), 0, '')
      const paymentChannel2 = new PaymentChannel('sender', 'receiver', hexChannelId2, new BigNumber.BigNumber(10), new BigNumber.BigNumber(0), 1, '')
      const paymentChannel3 = new PaymentChannel('sender', 'receiver', hexChannelId3, new BigNumber.BigNumber(10), new BigNumber.BigNumber(0), 2, '')

      return Promise.all([
        channels.save(paymentChannel1),
        channels.save(paymentChannel2),
        channels.save(paymentChannel3)
      ]).then(() => {
        return channels.allOpen()
      }).then(found => {
        expect(found.length).toBe(1)
        expect(found[0].channelId).toBe(paymentChannel1.channelId)
      })
    })

    describe('#findUsable', () => {
      it('returns the first channel for the specified sender and receiver whose value is less than the sum of the channel value and amount', async () => {
        const correct = ChannelId.random().toString()

        const remotelyModifiedId = ChannelId.random().toString()
        const getState = fakeContract.getState as sinon.SinonStub
        getState.withArgs(remotelyModifiedId).resolves(2)

        const instances = [
          new PaymentChannel('sender', 'receiver', ChannelId.random().toString(), new BigNumber.BigNumber(9), new BigNumber.BigNumber(8), 0, ''),
          new PaymentChannel('sender', 'receiver', correct, new BigNumber.BigNumber(13), new BigNumber.BigNumber(0), 0, ''),
          new PaymentChannel('sender', 'receiver', remotelyModifiedId, new BigNumber.BigNumber(13), new BigNumber.BigNumber(0), 0, ''),
          new PaymentChannel('sender', 'receiver', ChannelId.random().toString(), new BigNumber.BigNumber(13), new BigNumber.BigNumber(0), 2, ''),
          new PaymentChannel('sender', 'receiver', ChannelId.random().toString(), new BigNumber.BigNumber(130), new BigNumber.BigNumber(0), 1, ''),
          new PaymentChannel('othersender', 'receiver', ChannelId.random().toString(), new BigNumber.BigNumber(11), new BigNumber.BigNumber(0), 0, ''),
          new PaymentChannel('othersender', 'receiver', ChannelId.random().toString(), new BigNumber.BigNumber(11), new BigNumber.BigNumber(0), 2, '')
        ]

        await Promise.all(instances.map(chan => channels.save(chan)))
        let channel = await channels.findUsable('sender', 'receiver', new BigNumber.BigNumber(2))
        expect(channel!.channelId.toString()).toEqual(correct)
      })
    })
  })

  describe('TokensDatabase', () => {
    describe('#isPresent', () => {
      it('check if non-existent token is absent', () => {
        const randomToken = support.randomInteger().toString()
        return tokens.isPresent(randomToken).then((isPresent: boolean) => {
          expect(isPresent).toBeFalsy()
        })
      })

      it('check if existing token is present', () => {
        const randomToken = support.randomInteger().toString()
        const channelId = ChannelId.random()

        return channels.save(new PaymentChannel('sender', 'receiver', channelId.toString(), new BigNumber.BigNumber(10), new BigNumber.BigNumber(0), undefined, ''))
          .then(() => {
            return tokens.save(randomToken, channelId).then(() => {
              return tokens.isPresent(randomToken)
            }).then((isPresent: boolean) => {
              expect(isPresent).toBeTruthy()
            })
          })
      })
    })
  })
})
