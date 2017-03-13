'use strict'

const assert = require('assert')

const support = require('./support')

const storage = require('../lib/storage')
const channel = require('../lib/channel')

const describe = support.describe
const it = support.it

const databasePromise = (genDatabase) => {
  return support.tmpFileName().then(filename => {
    let engine = storage.engine(filename, true)
    return genDatabase(engine)
  })
}

const channelsDatabase = (_web3) => databasePromise(engine => {
  let web3 = _web3 || support.fakeWeb3()
  return storage.channels(web3, engine)
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
    it('return Engine instance', done => {
      support.tmpFileName().then(filename => {
        let engine = storage.engine(filename, true)
        assert.equal(typeof engine, 'object')
      }).then(done)
    })
  })

  describe('.build', () => {
    it('return Storage', done => {
      support.tmpFileName().then(filename => {
        let s = storage.build(filename, 'namespace')
        assert.equal(typeof s, 'object')
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
      it('return null if not found', done => {
        engine.then(engine => {
          return engine.findOne({number: support.randomInteger()})
        }).then(document => {
          assert.equal(document, null)
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
        }).then(doc => {
          assert.equal(doc.name, name)
          assert.equal(doc.nonce, nonce)
        }).then(done)
      })
    })
  })

  describe('.channels', () => {
    it('return ChannelsDatabase instance', () => {
      support.tmpFileName().then(filename => {
        let engine = storage.engine(filename)
        let channels = storage.channels(engine)
        assert.equal(typeof channels, 'object')
      })
    })
  })

  describe('ChannelsDatabase', () => {
    describe('#spend', () => {
      it('update spent amount', (done) => {
        let channelId = channel.id('0xdeadbeaf')
        let hexChannelId = channelId.toString()
        let paymentChannel = new channel.PaymentChannel('sender', 'receiver', hexChannelId, 10, 0)
        let spent = 33
        channelsDatabase(support.fakeWeb3()).then(channels => {
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
        let paymentChannel = new channel.PaymentChannel('sender', 'receiver', hexChannelId, 10, 0)
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
      it('return null if not found', done => {
        channelsDatabase().then(channels => {
          let channelId = support.randomChannelId()
          return channels.firstById(channelId)
        }).then(found => {
          assert.equal(found, null)
        }).then(done)
      })
    })
    describe('#saveOrUpdate', () => {
      it('save new PaymentChannel', done => {
        let channelId = support.randomChannelId()
        let hexChannelId = channelId.toString()
        let paymentChannel = new channel.PaymentChannel('sender', 'receiver', hexChannelId, 10, 0)
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

      it('update spent value on existing PaymentChannel', done => {
        let channelId = support.randomChannelId()
        let hexChannelId = channelId.toString()
        let spent = 5
        let paymentChannel = new channel.PaymentChannel('sender', 'receiver', hexChannelId, 10, 0)
        let updatedPaymentChannel = new channel.PaymentChannel('sender', 'receiver', hexChannelId, 10, spent)
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
      it('return all the channels', done => {
        let channelId = support.randomChannelId()
        let hexChannelId = channelId.toString()
        let paymentChannel = new channel.PaymentChannel('sender', 'receiver', hexChannelId, 10, 0)
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
      it('find according to query', done => {
        let aChannelId = support.randomChannelId()
        let aHexChannelId = aChannelId.toString()
        let aPaymentChannel = new channel.PaymentChannel('sender', 'receiver', aHexChannelId, 10, 0)

        let bChannelId = support.randomChannelId()
        let bHexChannelId = bChannelId.toString()
        let bPaymentChannel = new channel.PaymentChannel('sender2', 'receiver2', bHexChannelId, 10, 0)

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
      it('check if non-existent token is absent', done => {
        let randomToken = support.randomInteger().toString()
        tokensDatabase().then(tokens => {
          return tokens.isPresent(randomToken)
        }).then(isPresent => {
          assert.equal(isPresent, false)
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
          assert.equal(isPresent, true)
        }).then(done)
      })
    })
  })

  describe('PaymentsDatabase', () => {
    describe('#save and #firstMaximum', () => {
      it('match the data', done => {
        let randomToken = support.randomInteger().toString()
        let channelId = support.randomChannelId()
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
