'use strict'

const tmp = require('tmp')
const assert = require('assert')
const mocha = require('mocha')
const Promise = require('bluebird')

const receiver = require('../lib/receiver')
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

/**
 * @returns {Promise<Storage>}
 */
const randomStorage = () => {
  return tmpFileName().then(filename => {
    return storage.build(filename, null, true)
  })
}

describe('receiver', () => {
  describe('.build', () => {
    it('builds Receiver', done => {
      randomStorage().then(storage => {
        let result = receiver.build('0xdeadbeaf', storage)
        assert.equal(typeof result, 'object')
      }).then(done)
    })
  })

  describe('Receiver', () => {
    describe('#findPaymentChannel', () => {
      it('finds a channel if saved before', done => {
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
        let paymentChannel = channel.PaymentChannel.fromPayment(payment)
        randomStorage().then(storage => {
          return storage.channels.save(paymentChannel).then(() => {
            return receiver.build('0xdeadbeaf', storage).findPaymentChannel(payment)
          }).then(found => {
            assert.equal(found.channelId, channelId.toString())
            assert.equal(found.sender, payment.sender)
            assert.equal(found.receiver, payment.receiver)
          })
        }).then(done)
      })
    })
    describe('#findPaymentChannel', () => {
      it('returns null if not channel present', done => {
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
        randomStorage().then(storage => {
          return receiver.build('0xdeadbeaf', storage).findPaymentChannel(payment).then(found => {
            assert.equal(found, null)
          })
        }).then(done)
      })
    })
    describe('#whenValidPayment', () => {
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

      it('returns token', done => {
        randomStorage().then(storage => {
          return receiver.build('0xdeadbeaf', storage).whenValidPayment(payment).then(token => {
            assert.notEqual(token, null)
          })
        }).then(done)
      })

      it('save payment', done => {
        randomStorage().then(storage => {
          return receiver.build('0xdeadbeaf', storage).whenValidPayment(payment).then(() => {
            return storage.payments.firstMaximum(payment.channelId)
          }).then(savedPayment => {
            assert.equal(payment.channelId, savedPayment.channelId)
            assert.equal(payment.sender, savedPayment.sender)
            assert.equal(payment.receiver, savedPayment.receiver)
            assert.equal(payment.price, savedPayment.price)
            assert.equal(payment.value, savedPayment.value)
            assert.equal(payment.channelValue, savedPayment.channelValue)
            assert.equal(payment.r, savedPayment.r)
            assert.equal(payment.s, savedPayment.s)
            assert.equal(payment.v, savedPayment.v)
          })
        }).then(done)
      })

      it('save token', done => {
        randomStorage().then(storage => {
          return receiver.build('0xdeadbeaf', storage).whenValidPayment(payment).then(token => {
            return storage.tokens.isPresent(token)
          }).then(isPresent => {
            assert(isPresent)
          })
        }).then(done)
      })
    })

    describe('#acceptToken', () => {
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

      it('checks if token is present', done => {
        randomStorage().then(storage => {
          let r = receiver.build('0xdeadbeaf', storage)
          return r.whenValidPayment(payment).then(token => {
            return r.acceptToken(token)
          }).then(isPresent => {
            assert(isPresent)
          })
        }).then(done)
      })

      it('checks if token is absent', done => {
        let randomToken = randomInteger().toString()
        randomStorage().then(storage => {
          let r = receiver.build('0xdeadbeaf', storage)
          return r.acceptToken(randomToken).then(isPresent => {
            assert.equal(isPresent, false)
          })
        }).then(done)
      })
    })

    describe('#ensureCanAcceptPayment', () => {
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

      it('throws an error if can not', () => {
        randomStorage().then(storage => {
          let r = receiver.build('0xdeadbeaf', storage)
          assert.throws(() => {
            r.ensureCanAcceptPayment(payment)
          }, Error)
        })
      })
    })

    describe('#acceptPayment', () => {
      let channelId = channel.id(Buffer.from(randomInteger().toString()))
      let receiverAccount = '0xdeadbeaf'
      let payment = new channel.Payment({
        channelId: channelId.toString(),
        sender: 'sender',
        receiver: receiverAccount,
        price: 10,
        value: 12,
        channelValue: 10,
        v: 1,
        r: 2,
        s: 3
      })

      it('accepts new payment, and returns a token', done => {
        randomStorage().then(storage => {
          let r = receiver.build(receiverAccount, storage)
          return r.acceptPayment(payment).then(token => {
            assert.notEqual(token, null)
          })
        }).then(done)
      })
    })
  })
})
