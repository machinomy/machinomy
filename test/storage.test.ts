import * as support from './support'
import * as storage from '../lib/storage'
import * as channel from '../lib/channel'
import Payment from '../lib/Payment'
import * as BigNumber from 'bignumber.js'
import Engine from '../lib/engines/engine'
import Web3 = require('web3')
import { PaymentChannel } from '../lib/paymentChannel'

let expect = require('expect')

const engineName = process.env.ENGINE_NAME || 'nedb'

const channelsDatabase = (web3: Web3, engine: Engine) => {
  return Promise.resolve(storage.channels(web3, engine, null))
}

const tokensDatabase = (engine: Engine) => {
  return Promise.resolve(storage.tokens(engine, null))
}

const paymentsDatabase = (engine: Engine) => {
  return Promise.resolve(storage.payments(engine, null))
}

describe('storage', () => {
  let engine: Engine

  before(() => {
    return support.tmpFileName().then(filename => {
      engine = storage.engine(filename, true, engineName)
      return engine.connect()
    })
  })

  after(() => {
    return engine.close()
  })

  afterEach(() => {
    return engine.drop()
  })

  let web3 = support.fakeWeb3()

  describe('.engine', () => {
    it('return Engine instance', done => {
      support.tmpFileName().then(filename => {
        let engine = storage.engine(filename, true, engineName)
        expect(typeof engine).toBe('object')
      }).then(done)
    })
  })

  describe('.build', () => {
    it('return Storage', done => {
      support.tmpFileName().then(filename => {
        let s = storage.build(web3, filename, 'namespace', true, engineName)
        expect(typeof s).toBe('object')
      }).then(done)
    })
  })

  describe('.channels', () => {
    it('return ChannelsDatabase instance', () => {
      support.tmpFileName().then(filename => {
        let engine = storage.engine(filename)
        let channels = storage.channels(web3, engine, null)
        expect(typeof channels).toBe('object')
      })
    })
  })

  describe('ChannelsDatabase', () => {
    describe('#spend', () => {
      it('update spent amount', () => {
        let channelId = channel.id('0xdeadbeaf')
        let hexChannelId = channelId.toString()
        let paymentChannel = new channel.PaymentChannel('sender', 'receiver', hexChannelId, new BigNumber.BigNumber(10), new BigNumber.BigNumber(0), undefined, undefined)
        let spent = new BigNumber.BigNumber(33)
        return channelsDatabase(support.fakeWeb3(), engine).then(channels => {
          return channels.save(paymentChannel).then(() => {
            return channels.spend(channelId, spent)
          }).then(() => {
            return channels.firstById(channelId)
          })
        }).then((updated: any) => {
          expect(updated.channelId).toBe(hexChannelId)
          expect(updated.spent).toEqual(spent)
        })
      })
    })
    describe('#save and #firstById', () => {
      it('match', () => {
        let channelId = channel.id('0xdeadbeaf')
        let hexChannelId = channelId.toString()
        let paymentChannel = new channel.PaymentChannel('sender', 'receiver', hexChannelId, new BigNumber.BigNumber(10), new BigNumber.BigNumber(0), 0, undefined)
        return channelsDatabase(web3, engine).then((channels: any) => {
          return channels.save(paymentChannel).then(() => {
            return channels.firstById(channelId)
          })
        }).then(saved => {
          expect(saved.toString()).toBe(paymentChannel.toString())
        })
      })
    })
    describe('#firstById', () => {
      it('return null if not found', () => {
        return channelsDatabase(web3, engine).then(channels => {
          let channelId = support.randomChannelId()
          return channels.firstById(channelId)
        }).then(found => {
          expect(found).toBeNull()
        })
      })
    })
    describe('#saveOrUpdate', () => {
      it('save new PaymentChannel', () => {
        let channelId = support.randomChannelId()
        let hexChannelId = channelId.toString()
        let paymentChannel = new channel.PaymentChannel('sender', 'receiver', hexChannelId, new BigNumber.BigNumber(10), new BigNumber.BigNumber(0), undefined, undefined)
        return channelsDatabase(web3, engine).then(channels => {
          return channels.firstById(channelId).then(found => {
            expect(found).toBeNull()
          }).then(() => {
            return channels.saveOrUpdate(paymentChannel)
          }).then(() => {
            return channels.firstById(channelId)
          }).then(found => {
            expect(JSON.stringify(found)).toBe(JSON.stringify(paymentChannel))
          })
        })
      })

      it('update spent value on existing PaymentChannel', () => {
        let channelId = support.randomChannelId()
        let hexChannelId = channelId.toString()
        let spent = new BigNumber.BigNumber(5)
        let paymentChannel = new channel.PaymentChannel('sender', 'receiver', hexChannelId, new BigNumber.BigNumber(10), new BigNumber.BigNumber(0), undefined, undefined)
        let updatedPaymentChannel = new channel.PaymentChannel('sender', 'receiver', hexChannelId, new BigNumber.BigNumber(10), spent, undefined, undefined)
        return channelsDatabase(web3, engine).then(channels => {
          return channels.save(paymentChannel).then(() => {
            return channels.saveOrUpdate(updatedPaymentChannel)
          }).then(() => {
            return channels.firstById(channelId)
          }).then((found: any) => {
            expect(found.spent).toEqual(spent)
          })
        })
      })
    })

    describe('#all', () => {
      it('return all the channels', () => {
        let channelId = support.randomChannelId()
        let hexChannelId = channelId.toString()
        let paymentChannel = new channel.PaymentChannel('sender', 'receiver', hexChannelId, new BigNumber.BigNumber(10), new BigNumber.BigNumber(0), undefined, undefined)
        return channelsDatabase(web3, engine).then(channels => {
          return channels.save(paymentChannel).then(() => {
            return channels.all()
          }).then(found => {
            expect(found.length).toBe(1)
            let foundChannelId = found[0].channelId
            expect(foundChannelId).toBe(hexChannelId)
          })
        })
      })
    })

    describe('#firstUsable', () => {
      it('returns the first channel for the specified sender and receiver whose value is less than the sum of the channel value and amount', () => {
        const correct = support.randomChannelId().toString()

        return channelsDatabase(web3, engine).then((channels) => {
          return Promise.all([
            channels.save(new channel.PaymentChannel('sender', 'receiver', support.randomChannelId().toString(), new BigNumber.BigNumber(9), new BigNumber.BigNumber(8), 0, undefined)),
            channels.save(new channel.PaymentChannel('sender', 'receiver', correct, new BigNumber.BigNumber(13), new BigNumber.BigNumber(0), 0, undefined)),
            channels.save(new channel.PaymentChannel('sender', 'receiver', support.randomChannelId().toString(), new BigNumber.BigNumber(130), new BigNumber.BigNumber(0), 1, undefined)),
            channels.save(new channel.PaymentChannel('othersender', 'receiver', support.randomChannelId().toString(), new BigNumber.BigNumber(11), new BigNumber.BigNumber(0), 0, undefined))
          ]).then(() => channels)
        }).then((channels) => channels.findUsable('sender', 'receiver', new BigNumber.BigNumber(2)))
          .then((channel: PaymentChannel) => expect(channel.channelId.toString()).toEqual(correct))
      })
    })
  })

  describe('TokensDatabase', () => {
    describe('#isPresent', () => {
      it('check if non-existent token is absent', () => {
        let randomToken = support.randomInteger().toString()
        return tokensDatabase(engine).then(tokens => {
          return tokens.isPresent(randomToken)
        }).then(isPresent => {
          expect(isPresent).toBeFalsy()
        })
      })

      it('check if existing token is present', () => {
        let randomToken = support.randomInteger().toString()
        let channelId = support.randomChannelId()
        return channelsDatabase(web3, engine).then(channels => {
          return channels.save(new channel.PaymentChannel('sender', 'receiver', channelId.toString(), new BigNumber.BigNumber(10), new BigNumber.BigNumber(0), undefined, undefined))
        }).then(() => tokensDatabase(engine)).then(tokens => {
          return tokens.save(randomToken, channelId).then(() => {
            return tokens.isPresent(randomToken)
          })
        }).then(isPresent => {
          expect(isPresent).toBeTruthy()
        })
      })
    })
  })

  describe('PaymentsDatabase', () => {
    describe('#save and #firstMaximum', () => {
      it('match the data', () => {
        let randomToken = support.randomInteger().toString()
        let channelId = support.randomChannelId()
        let payment = new Payment({
          channelId: channelId.toString(),
          sender: 'sender',
          receiver: 'receiver',
          price: new BigNumber.BigNumber(10),
          value: new BigNumber.BigNumber(12),
          channelValue: new BigNumber.BigNumber(10),
          meta: 'metaexample',
          v: 1,
          r: '0x2',
          s: '0x3',
          token: undefined
        })

        return channelsDatabase(web3, engine).then(channels => {
          return channels.save(new channel.PaymentChannel('sender', 'receiver', channelId.toString(), new BigNumber.BigNumber(10), new BigNumber.BigNumber(0), undefined, undefined))
        }).then(() => paymentsDatabase(engine))
          .then(payments => {
            return payments.save(randomToken, payment).then(() => {
              return payments.firstMaximum(channelId)
            })
          }).then((found: any) => {
            expect(found.channelId).toBe(payment.channelId)
            expect(found.token).toBe(randomToken)
            expect(found.r).toBe(payment.r)
            expect(found.s).toBe(payment.s)
            expect(found.v).toBe(payment.v)
          })
      })
    })
  })
})
