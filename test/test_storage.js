'use strict'

const tmp = require('tmp')
const assert = require('assert')
const mocha = require('mocha')
const Promise = require('bluebird')

const storage = require('../lib/storage')
const channel = require('../lib/channel')

const describe = mocha.describe
const it = mocha.it

const tmpFileName = Promise.promisify(tmp.tmpName)

/**
 * @return {number}
 */
const randomInteger = () => {
  return Math.floor(Math.random() * 10000)
}

const databasePromise = (genDatabase) => {
  return tmpFileName().then(filename => {
    let engine = storage.engine(filename, true)
    return genDatabase(engine)
  })
}

const channelsDatabase = () => databasePromise(engine => {
  return storage.channels(engine)
})

const tokensDatabase = () => databasePromise(engine => {
  return storage.tokens(engine)
})

/**
 * @returns {Promise<PaymentsDatabase>}
 */
const paymentsDatabase = () => databasePromise(engine => {
  return storage.payments(engine)
})

describe('storage', () => {
  describe('.engine', () => {
    it('returns Engine instance', () => {
      tmpFileName().then(filename => {
        let engine = storage.engine(filename, true)
        assert.equal(typeof engine, 'object')
      })
    })
  })

  describe('Engine', () => {
    let engine = tmpFileName().then(filename => {
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
          assert.equal(returnedDocs.length, 1)
          assert.equal(returnedDocs[0].name, name)
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
        }).then(document => {
          assert.equal(document.name, name)
        }).then(done)
      })
    })

    describe('#findOne', () => {
      it('returns null if not found', done => {
        engine.then(engine => {
          return engine.findOne({number: randomInteger()})
        }).then(document => {
          assert.equal(document, null)
        }).then(done)
      })
    })

    describe('#update', () => {
      it('updates the data', done => {
        const name = 'foo'
        const nonce = randomInteger()
        engine.then(engine => {
          return engine.insert({name: name}).then(() => {
            let update = {
              $set: { nonce: nonce }
            }
            return engine.update({name: name}, update).then(() => {
              return engine.findOne({name: name})
            })
          })
        }).then(doc => {
          assert.equal(doc.name, name)
          assert.equal(doc.nonce, nonce)
        }).then(done)
      })
    })
  })

  describe('.channels', () => {
    it('returns ChannelsDatabase instance', () => {
      tmpFileName().then(filename => {
        let engine = storage.engine(filename)
        let channels = storage.channels(engine)
        assert.equal(typeof channels, 'object')
      })
    })
  })

  describe('ChannelsDatabase', () => {
    describe('#spend', () => {
      it('updates spent amount', (done) => {
        let channelId = channel.id('0xdeadbeaf')
        let hexChannelId = channelId.toString()
        let paymentChannel = new channel.PaymentChannel('sender', 'receiver', hexChannelId, 'contract', 10, 0)
        let spent = 33
        channelsDatabase().then(channels => {
          return channels.save(paymentChannel).then(() => {
            return channels.spend(channelId, spent)
          }).then(() => {
            return channels.firstById(channelId)
          })
        }).then(updated => {
          assert.deepEqual(updated.channelId, hexChannelId)
          assert.equal(updated.spent, spent)
        }).then(done)
      })
    })
    describe('#save and #firstById', () => {
      it('match', done => {
        let channelId = channel.id('0xdeadbeaf')
        let hexChannelId = channelId.toString()
        let paymentChannel = new channel.PaymentChannel('sender', 'receiver', hexChannelId, 'contract', 10, 0)
        channelsDatabase().then(channels => {
          return channels.save(paymentChannel).then(() => {
            return channels.firstById(channelId)
          })
        }).then(saved => {
          assert.deepEqual(saved, paymentChannel)
        }).then(done)
      })
    })
    describe('#firstById', () => {
      it('returns null if not found', done => {
        channelsDatabase().then(channels => {
          let channelId = channel.id(Buffer.from(randomInteger().toString()))
          return channels.firstById(channelId)
        }).then(found => {
          assert.equal(found, null)
        }).then(done)
      })
    })
    describe('#saveOrUpdate', () => {
      it('saves new PaymentChannel', done => {
        let channelId = channel.id(Buffer.from(randomInteger().toString()))
        let hexChannelId = channelId.toString()
        let paymentChannel = new channel.PaymentChannel('sender', 'receiver', hexChannelId, 'contract', 10, 0)
        channelsDatabase().then(channels => {
          return channels.firstById(channelId).then(found => {
            assert.equal(found, null)
          }).then(() => {
            return channels.saveOrUpdate(paymentChannel)
          }).then(() => {
            return channels.firstById(channelId)
          }).then(found => {
            assert.deepEqual(found, paymentChannel)
          })
        }).then(done)
      })

      it('updates spent value on existing PaymentChannel', done => {
        let channelId = channel.id(Buffer.from(randomInteger().toString()))
        let hexChannelId = channelId.toString()
        let spent = 5
        let paymentChannel = new channel.PaymentChannel('sender', 'receiver', hexChannelId, 'contract', 10, 0)
        let updatedPaymentChannel = new channel.PaymentChannel('sender', 'receiver', hexChannelId, 'contract', 10, spent)
        channelsDatabase().then(channels => {
          return channels.save(paymentChannel).then(() => {
            return channels.saveOrUpdate(updatedPaymentChannel)
          }).then(() => {
            return channels.firstById(channelId)
          }).then(found => {
            assert.equal(found.spent, spent)
          })
        }).then(done)
      })
    })

    describe('#all', () => {
      it('returns all the channels', done => {
        let channelId = channel.id(Buffer.from(randomInteger().toString()))
        let hexChannelId = channelId.toString()
        let paymentChannel = new channel.PaymentChannel('sender', 'receiver', hexChannelId, 'contract', 10, 0)
        channelsDatabase().then(channels => {
          return channels.save(paymentChannel).then(() => {
            return channels.all()
          }).then(found => {
            assert.equal(found.length, 1)
            let foundChannelId = found[0].channelId
            assert.equal(foundChannelId, hexChannelId)
          })
        }).then(done)
      })
    })

    describe('#allByQuery', () => {
      it('finds according to query', done => {
        let aChannelId = channel.id(Buffer.from(randomInteger().toString()))
        let aHexChannelId = aChannelId.toString()
        let aPaymentChannel = new channel.PaymentChannel('sender', 'receiver', aHexChannelId, 'contract', 10, 0)

        let bChannelId = channel.id(Buffer.from(randomInteger().toString()))
        let bHexChannelId = bChannelId.toString()
        let bPaymentChannel = new channel.PaymentChannel('sender2', 'receiver2', bHexChannelId, 'contract', 10, 0)

        channelsDatabase().then(channels => {
          return channels.save(aPaymentChannel).then(() => {
            return channels.save(bPaymentChannel)
          }).then(() => {
            return channels.allByQuery({sender: 'sender2'})
          }).then(found => {
            assert.equal(found.length, 1)
            let foundChannelId = found[0].channelId
            assert.equal(foundChannelId, bHexChannelId)
          })
        }).then(done)
      })
    })
  })

  describe('TokensDatabase', () => {
    describe('#isPresent', () => {
      it('checks if non-existent token is absent', done => {
        let randomToken = randomInteger().toString()
        tokensDatabase().then(tokens => {
          return tokens.isPresent(randomToken)
        }).then(isPresent => {
          assert.equal(isPresent, false)
        }).then(done)
      })

      it('checks if existing token is present', done => {
        let randomToken = randomInteger().toString()
        let channelId = channel.id(Buffer.from(randomInteger().toString()))
        tokensDatabase().then(tokens => {
          return tokens.save(randomToken, channelId).then(() => {
            return tokens.isPresent(randomToken)
          })
        }).then(isPresent => {
          assert.equal(isPresent, true)
        }).then(done)
      })
    })
  })

  describe('PaymentsDatabase', () => {
    describe('#save and #firstMaximum', () => {
      it('match the data', done => {
        let randomToken = randomInteger().toString()
        let channelId = channel.id(Buffer.from(randomInteger().toString()))
        let payment = new channel.Payment({
          channelId: channelId.toString(),
          sender: 'sender',
          receiver: 'receiver',
          price: 10,
          value: 12,
          channelValue: 10,
          v: 1,
          r: 2,
          s: 3
        })
        paymentsDatabase().then(payments => {
          return payments.save(randomToken, payment).then(() => {
            return payments.firstMaximum(channelId)
          })
        }).then(found => {
          assert.deepEqual(found.channelId, payment.channelId)
          assert.equal(found.token, randomToken)
          assert.deepEqual(found.r, payment.r)
          assert.deepEqual(found.s, payment.s)
          assert.deepEqual(found.v, payment.v)
        }).then(done)
      })
    })
  })

})
