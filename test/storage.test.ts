import * as sinon from 'sinon'
import * as support from './support'
import * as channel from '../lib/channel'
import Payment from '../lib/payment'
import * as BigNumber from 'bignumber.js'
import Engine, { EngineMongo, EngineNedb, EnginePostgres } from '../lib/engines/engine'
import { PaymentChannel } from '../lib/payment_channel'
import {
  AbstractChannelsDatabase,
  default as ChannelsDatabase,
  MongoChannelsDatabase,
  NedbChannelsDatabase,
  PostgresChannelsDatabase
} from '../lib/storages/channels_database'
import PaymentsDatabase, {
  MongoPaymentsDatabase,
  NedbPaymentsDatabase,
  PostgresPaymentsDatabase
} from '../lib/storages/payments_database'
import TokensDatabase, {
  MongoTokensDatabase,
  NedbTokensDatabase,
  PostgresTokensDatabase
} from '../lib/storages/tokens_database'
import ChannelContract from '../lib/channel_contract'
import Signature from '../lib/signature'

const expect = require('expect')

const engineName = process.env.ENGINE_NAME || 'nedb'

function buildEngine (filename: string): Engine {
  switch (engineName) {
    case 'nedb':
      return new EngineNedb(filename, false)
    case 'mongo':
      return new EngineMongo('mongodb://localhost:27017/machinomy')
    case 'postgresql':
      return new EnginePostgres()
    default:
      throw new Error(`Invalid engine ${engineName}.`)
  }
}

function buildDatabases (engine: Engine, channelContract: ChannelContract): [ChannelsDatabase, PaymentsDatabase, TokensDatabase] {
  if (engine instanceof EngineNedb) {
    return [new NedbChannelsDatabase(engine, channelContract, null), new NedbPaymentsDatabase(engine, null), new NedbTokensDatabase(engine, null)]
  }

  if (engine instanceof EnginePostgres) {
    return [new PostgresChannelsDatabase(engine, channelContract, null), new PostgresPaymentsDatabase(engine, null), new PostgresTokensDatabase(engine, null)]
  }

  if (engine instanceof EngineMongo) {
    return [new MongoChannelsDatabase(engine, channelContract, null), new MongoPaymentsDatabase(engine, null), new MongoTokensDatabase(engine, null)]
  }

  throw new Error('Invalid engine.')
}

describe('storage', () => {
  let engine: Engine

  let channels: ChannelsDatabase

  let payments: PaymentsDatabase

  let tokens: TokensDatabase

  let fakeContract: ChannelContract

  before(() => {
    return support.tmpFileName().then(filename => {
      engine = buildEngine(filename)

      fakeContract = {} as ChannelContract
      fakeContract.getState = (): Promise<number> => {
        return Promise.resolve(0)
      }

      const databases = buildDatabases(engine, fakeContract)
      channels = databases[0]
      payments = databases[1]
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
      it('updates the state value', () => {
        const id = support.randomChannelId().toString()

        sinon.stub((channels as AbstractChannelsDatabase<Engine>).contract, 'getState').resolves(2)
        return channels.save(new PaymentChannel('sender', 'receiver', id, new BigNumber.BigNumber(69), new BigNumber.BigNumber(8), 0, undefined))
          .then(() => channels.updateState(id, 2))
          .then(() => channels.firstById(id))
          .then((chan: PaymentChannel) => expect(chan.state).toBe(2))
      })
    })

    describe('#spend', () => {
      it('update spent amount', () => {
        const channelId = channel.id('0xdeadbeaf')
        const hexChannelId = channelId.toString()
        const paymentChannel = new PaymentChannel('sender', 'receiver', hexChannelId, new BigNumber.BigNumber(10), new BigNumber.BigNumber(0), undefined, undefined)
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
        const channelId = channel.id('0xdeadbeaf')
        const hexChannelId = channelId.toString()
        const paymentChannel = new PaymentChannel('sender', 'receiver', hexChannelId, new BigNumber.BigNumber(10), new BigNumber.BigNumber(0), 0, undefined)

        return channels.save(paymentChannel).then(() => {
          return channels.firstById(channelId)
        }).then((saved: any) => {
          expect(saved.toString()).toBe(paymentChannel.toString())
        })
      })
    })

    describe('#firstById', () => {
      it('return null if not found', () => {
        const channelId = support.randomChannelId()
        return channels.firstById(channelId).then((found: any) => {
          expect(found).toBeNull()
        })
      })
    })

    describe('#saveOrUpdate', () => {
      it('save new PaymentChannel', () => {
        ((channels as AbstractChannelsDatabase<Engine>).contract.getState as sinon.SinonStub).resolves(0)
        const channelId = support.randomChannelId()
        const hexChannelId = channelId.toString()
        const paymentChannel = new PaymentChannel('sender', 'receiver', hexChannelId, new BigNumber.BigNumber(10), new BigNumber.BigNumber(0), 0, undefined)
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
    })

    it('update spent value on existing PaymentChannel', () => {
      const channelId = support.randomChannelId()
      const hexChannelId = channelId.toString()
      const spent = new BigNumber.BigNumber(5)
      const paymentChannel = new PaymentChannel('sender', 'receiver', hexChannelId, new BigNumber.BigNumber(10), new BigNumber.BigNumber(0), undefined, undefined)
      const updatedPaymentChannel = new PaymentChannel('sender', 'receiver', hexChannelId, new BigNumber.BigNumber(10), spent, undefined, undefined)
      return channels.save(paymentChannel).then(() => {
        return channels.saveOrUpdate(updatedPaymentChannel)
      }).then(() => {
        return channels.firstById(channelId)
      }).then((found: any) => {
        expect(found.spent).toEqual(spent)
      })
    })
  })

  describe('#all', () => {
    it('return all the channels', () => {
      const channelId = support.randomChannelId()
      const hexChannelId = channelId.toString()
      const paymentChannel = new PaymentChannel('sender', 'receiver', hexChannelId, new BigNumber.BigNumber(10), new BigNumber.BigNumber(0), undefined, undefined)
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
      const channelId1 = support.randomChannelId()
      const channelId2 = support.randomChannelId()
      const hexChannelId1 = channelId1.toString()
      const hexChannelId2 = channelId2.toString()
      const paymentChannel1 = new PaymentChannel('sender', 'receiver', hexChannelId1, new BigNumber.BigNumber(10), new BigNumber.BigNumber(0), 0, undefined)
      const paymentChannel2 = new PaymentChannel('sender', 'receiver', hexChannelId2, new BigNumber.BigNumber(10), new BigNumber.BigNumber(0), 1, undefined)

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
      const channelId1 = support.randomChannelId()
      const channelId2 = support.randomChannelId()
      const channelId3 = support.randomChannelId()
      const hexChannelId1 = channelId1.toString()
      const hexChannelId2 = channelId2.toString()
      const hexChannelId3 = channelId3.toString()
      const paymentChannel1 = new PaymentChannel('sender', 'receiver', hexChannelId1, new BigNumber.BigNumber(10), new BigNumber.BigNumber(0), 0, undefined)
      const paymentChannel2 = new PaymentChannel('sender', 'receiver', hexChannelId2, new BigNumber.BigNumber(10), new BigNumber.BigNumber(0), 1, undefined)
      const paymentChannel3 = new PaymentChannel('sender', 'receiver', hexChannelId3, new BigNumber.BigNumber(10), new BigNumber.BigNumber(0), 2, undefined)

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
      it('returns the first channel for the specified sender and receiver whose value is less than the sum of the channel value and amount', () => {
        const correct = support.randomChannelId().toString()

        const remotelyModifiedId = support.randomChannelId().toString()
        const getState = fakeContract.getState as sinon.SinonStub
        getState.withArgs(remotelyModifiedId).resolves(2)

        return Promise.all([
          channels.save(new PaymentChannel('sender', 'receiver', support.randomChannelId().toString(), new BigNumber.BigNumber(9), new BigNumber.BigNumber(8), 0, undefined)),
          channels.save(new PaymentChannel('sender', 'receiver', correct, new BigNumber.BigNumber(13), new BigNumber.BigNumber(0), 0, undefined)),
          channels.save(new PaymentChannel('sender', 'receiver', remotelyModifiedId, new BigNumber.BigNumber(13), new BigNumber.BigNumber(0), 0, undefined)),
          channels.save(new PaymentChannel('sender', 'receiver', support.randomChannelId().toString(), new BigNumber.BigNumber(13), new BigNumber.BigNumber(0), 2, undefined)),
          channels.save(new PaymentChannel('sender', 'receiver', support.randomChannelId().toString(), new BigNumber.BigNumber(130), new BigNumber.BigNumber(0), 1, undefined)),
          channels.save(new PaymentChannel('othersender', 'receiver', support.randomChannelId().toString(), new BigNumber.BigNumber(11), new BigNumber.BigNumber(0), 0, undefined)),
          channels.save(new PaymentChannel('othersender', 'receiver', support.randomChannelId().toString(), new BigNumber.BigNumber(11), new BigNumber.BigNumber(0), 2, undefined))
        ]).then(() => channels).then((channels) => channels.findUsable('sender', 'receiver', new BigNumber.BigNumber(2)))
          .then((channel: PaymentChannel) => expect(channel.channelId.toString()).toEqual(correct))
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
        const channelId = support.randomChannelId()

        return channels.save(new PaymentChannel('sender', 'receiver', channelId.toString(), new BigNumber.BigNumber(10), new BigNumber.BigNumber(0), undefined, undefined))
          .then(() => {
            return tokens.save(randomToken, channelId).then(() => {
              return tokens.isPresent(randomToken)
            }).then((isPresent: boolean) => {
              expect(isPresent).toBeTruthy()
            })
          })
      })
    })

    describe('PaymentsDatabase', () => {
      describe('#save and #firstMaximum', () => {
        it('match the data', () => {
          const randomToken = support.randomInteger().toString()
          const channelId = support.randomChannelId()
          const payment = new Payment({
            channelId: channelId.toString(),
            sender: 'sender',
            receiver: 'receiver',
            price: new BigNumber.BigNumber(10),
            value: new BigNumber.BigNumber(12),
            channelValue: new BigNumber.BigNumber(10),
            meta: 'metaexample',
            signature: Signature.fromParts({
              v: 27,
              r: '0x2',
              s: '0x3'
            }),
            token: undefined,
            contractAddress: undefined
          })

          return channels.save(new PaymentChannel('sender', 'receiver', channelId.toString(), new BigNumber.BigNumber(10), new BigNumber.BigNumber(0), undefined, undefined))
            .then(() => {
              return payments.save(randomToken, payment).then(() => {
                return payments.firstMaximum(channelId)
              })
            }).then((found: any) => {
              expect(found.channelId).toBe(payment.channelId)
              expect(found.token).toBe(randomToken)
              expect(found.signature.isEqual(payment.signature)).toBe(true)
            })
        })
      })
    })
  })
})
