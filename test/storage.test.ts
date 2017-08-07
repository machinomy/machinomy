import * as support from './support'
import * as storage from '../lib/storage'
import * as channel from '../lib/channel'

import Web3 = require('web3')
import Promise = require('bluebird')
import Payment from '../lib/Payment'

function databasePromise <A> (genDatabase: (engine: storage.Engine) => A): Promise<A> {
  return support.tmpFileName().then(filename => {
    let engine = storage.engine(filename, true)
    return genDatabase(engine)
  })
}

const channelsDatabase = (_web3: Web3) => databasePromise((engine: storage.Engine) => {
  let web3 = _web3 || support.fakeWeb3()
  return storage.channels(web3, engine, null)
})

const tokensDatabase = () => databasePromise(engine => {
  return storage.tokens(engine, null)
})

const paymentsDatabase = () => databasePromise(engine => {
  return storage.payments(engine, null)
})

describe('storage', () => {
  let web3 = support.fakeWeb3()

  describe('.engine', () => {
    it('return Engine instance', done => {
      support.tmpFileName().then(filename => {
        let engine = storage.engine(filename, true)
        expect(typeof engine).toBe('object')
      }).then(done)
    })
  })

  describe('.build', () => {
    it('return Storage', done => {
      support.tmpFileName().then(filename => {
        let s = storage.build(web3, filename, 'namespace')
        expect(typeof s).toBe('object')
      }).then(done)
    })
  })

  describe('Engine', () => {
    let engine = support.tmpFileName().then(filename => {
      return storage.engine(filename, true)
    })

    describe('#insert and #find', () => {
      it('match the data', done => {
        const name = 'foo'
        engine.then(engine => {
          return engine.insert({name: name}).then(() => {
            return engine.find({name: name})
          })
        }).then(returnedDocs => {
          expect(returnedDocs.length).toBe(1)
          let doc: any = returnedDocs[0]
          expect(doc).not.toBeNull()
          if (doc) {
            expect(doc.name).toBe(name)
          }
        }).then(done)
      })
    })

    describe('#insert and #findOne', () => {
      it('match the data', done => {
        const name = 'foo'
        engine.then(engine => {
          return engine.insert({name: name}).then(() => {
            return engine.findOne({name: name})
          })
        }).then((document: any) => {
          expect(document.name).toBe(name)
        }).then(done)
      })
    })

    describe('#findOne', () => {
      it('return null if not found', done => {
        engine.then(engine => {
          return engine.findOne({number: support.randomInteger()})
        }).then(document => {
          expect(document).toBeNull()
        }).then(done)
      })
    })

    describe('#update', () => {
      it('update the data', done => {
        const name = 'foo'
        const nonce = support.randomInteger()
        engine.then(engine => {
          return engine.insert({name: name}).then(() => {
            let update = {
              $set: { nonce: nonce }
            }
            return engine.update({name: name}, update).then(() => {
              return engine.findOne({name: name})
            })
          })
        }).then((doc: any) => {
          expect(doc.name).toBe(name)
          expect(doc.nonce).toBe(nonce)
        }).then(done)
      })
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
      it('update spent amount', (done) => {
        let channelId = channel.id('0xdeadbeaf')
        let hexChannelId = channelId.toString()
        let paymentChannel = new channel.PaymentChannel('sender', 'receiver', hexChannelId, 10, 0, 0, 0)
        let spent = 33
        channelsDatabase(support.fakeWeb3()).then(channels => {
          return channels.save(paymentChannel).then(() => {
            return channels.spend(channelId, spent)
          }).then(() => {
            return channels.firstById(channelId)
          })
        }).then((updated: any) => {
          expect(updated.channelId).toBe(hexChannelId)
          expect(updated.spent).toBe(spent)
        }).then(done)
      })
    })
    describe('#save and #firstById', () => {
      it('match', () => {
        let channelId = channel.id('0xdeadbeaf')
        let hexChannelId = channelId.toString()
        let paymentChannel = new channel.PaymentChannel('sender', 'receiver', hexChannelId, 10, 0, 0, 0)
        return channelsDatabase(web3).then((channels: any) => {
          return channels.save(paymentChannel).then(() => {
            return channels.firstById(channelId)
          })
        }).then(saved => {
          expect(saved.toString()).toBe(paymentChannel.toString())
        })
      })
    })
    describe('#firstById', () => {
      it('return null if not found', done => {
        channelsDatabase(web3).then(channels => {
          let channelId = support.randomChannelId()
          return channels.firstById(channelId)
        }).then(found => {
          expect(found).toBeNull()
        }).then(done)
      })
    })
    describe('#saveOrUpdate', () => {
      it('save new PaymentChannel', () => {
        let channelId = support.randomChannelId()
        let hexChannelId = channelId.toString()
        let paymentChannel = new channel.PaymentChannel('sender', 'receiver', hexChannelId, 10, 0, 0, 0)
        return channelsDatabase(web3).then(channels => {
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

      it('update spent value on existing PaymentChannel', done => {
        let channelId = support.randomChannelId()
        let hexChannelId = channelId.toString()
        let spent = 5
        let paymentChannel = new channel.PaymentChannel('sender', 'receiver', hexChannelId, 10, 0, 0, 0)
        let updatedPaymentChannel = new channel.PaymentChannel('sender', 'receiver', hexChannelId, 10, spent, 0, 0)
        channelsDatabase(web3).then(channels => {
          return channels.save(paymentChannel).then(() => {
            return channels.saveOrUpdate(updatedPaymentChannel)
          }).then(() => {
            return channels.firstById(channelId)
          }).then((found: any) => {
            expect(found.spent).toBe(spent)
          })
        }).then(done)
      })
    })

    describe('#all', () => {
      it('return all the channels', done => {
        let channelId = support.randomChannelId()
        let hexChannelId = channelId.toString()
        let paymentChannel = new channel.PaymentChannel('sender', 'receiver', hexChannelId, 10, 0, 0, 0)
        channelsDatabase(web3).then(channels => {
          return channels.save(paymentChannel).then(() => {
            return channels.all()
          }).then(found => {
            expect(found.length).toBe(1)
            let foundChannelId = found[0].channelId
            expect(foundChannelId).toBe(hexChannelId)
          })
        }).then(done)
      })
    })

    describe('#allByQuery', () => {
      it('find according to query', done => {
        let aChannelId = support.randomChannelId()
        let aHexChannelId = aChannelId.toString()
        let aPaymentChannel = new channel.PaymentChannel('sender', 'receiver', aHexChannelId, 10, 0, 0, 0)

        let bChannelId = support.randomChannelId()
        let bHexChannelId = bChannelId.toString()
        let bPaymentChannel = new channel.PaymentChannel('sender2', 'receiver2', bHexChannelId, 10, 0, 0, 0)

        channelsDatabase(web3).then(channels => {
          return channels.save(aPaymentChannel).then(() => {
            return channels.save(bPaymentChannel)
          }).then(() => {
            return channels.allByQuery({sender: 'sender2'})
          }).then(found => {
            expect(found.length).toBe(1)
            let foundChannelId = found[0].channelId
            expect(foundChannelId).toBe(bHexChannelId)
          })
        }).then(done)
      })
    })
  })

  describe('TokensDatabase', () => {
    describe('#isPresent', () => {
      it('check if non-existent token is absent', done => {
        let randomToken = support.randomInteger().toString()
        tokensDatabase().then(tokens => {
          return tokens.isPresent(randomToken)
        }).then(isPresent => {
          expect(isPresent).toBeFalsy()
        }).then(done)
      })

      it('check if existing token is present', done => {
        let randomToken = support.randomInteger().toString()
        let channelId = support.randomChannelId()
        tokensDatabase().then(tokens => {
          return tokens.save(randomToken, channelId).then(() => {
            return tokens.isPresent(randomToken)
          })
        }).then(isPresent => {
          expect(isPresent).toBeTruthy()
        }).then(done)
      })
    })
  })

  describe('PaymentsDatabase', () => {
    describe('#save and #firstMaximum', () => {
      it('match the data', done => {
        let randomToken = support.randomInteger().toString()
        let channelId = support.randomChannelId()
        let payment = new Payment({
          channelId: channelId.toString(),
          sender: 'sender',
          receiver: 'receiver',
          price: 10,
          value: 12,
          channelValue: 10,
          nonce: 1,
          v: 1,
          r: '0x2',
          s: '0x3'
        })
        paymentsDatabase().then(payments => {
          return payments.save(randomToken, payment).then(() => {
            return payments.firstMaximum(channelId)
          })
        }).then((found: any) => {
          expect(found.channelId).toBe(payment.channelId)
          expect(found.token).toBe(randomToken)
          expect(found.r).toBe(payment.r)
          expect(found.s).toBe(payment.s)
          expect(found.v).toBe(payment.v)
        }).then(done)
      })
    })
  })
})
