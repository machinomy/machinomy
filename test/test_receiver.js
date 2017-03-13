'use strict'

const assert = require('assert')

const support = require('./support')

const receiver = require('../lib/receiver')
const storage = require('../lib/storage')
const channel = require('../lib/channel')

const describe = support.describe
const it = support.it

/**
 * @returns {Promise<Storage>}
 */
const randomStorage = (web3) => {
  return support.tmpFileName().then(filename => {
    return storage.build(web3, filename, null, true)
  })
}

describe('receiver', () => {
  describe('.build', () => {
    it('build Receiver', done => {
      randomStorage().then(storage => {
        let result = receiver.build('0xdeadbeaf', storage)
        assert.equal(typeof result, 'object')
      }).then(done)
    })
  })

  describe('Receiver', () => {
    let web3 = support.fakeWeb3()

    describe('#findPaymentChannel', () => {
      it('find a channel if saved before', done => {
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
        let paymentChannel = channel.PaymentChannel.fromPayment(payment)
        randomStorage(web3).then(storage => {
          return storage.channels.save(paymentChannel).then(() => {
            return receiver.build(web3, '0xdeadbeaf', storage).findPaymentChannel(payment)
          }).then(found => {
            assert.equal(found.channelId, channelId.toString())
            assert.equal(found.sender, payment.sender)
            assert.equal(found.receiver, payment.receiver)
          })
        }).then(done)
      })
    })
    describe('#findPaymentChannel', () => {
      it('return null if not channel present', done => {
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
        randomStorage(web3).then(storage => {
          return receiver.build(web3, '0xdeadbeaf', storage).findPaymentChannel(payment).then(found => {
            assert.equal(found, null)
          })
        }).then(done)
      })
    })
    describe('#whenValidPayment', () => {
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
      it('return token', done => {
        randomStorage(web3).then(storage => {
          return receiver.build(web3, '0xdeadbeaf', storage).whenValidPayment(payment).then(token => {
            assert.notEqual(token, null)
          })
        }).then(done)
      })

      it('save payment', done => {
        randomStorage(web3).then(storage => {
          return receiver.build(web3, '0xdeadbeaf', storage).whenValidPayment(payment).then(() => {
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
        randomStorage(web3).then(storage => {
          return receiver.build(web3, '0xdeadbeaf', storage).whenValidPayment(payment).then(token => {
            return storage.tokens.isPresent(token)
          }).then(isPresent => {
            assert(isPresent)
          })
        }).then(done)
      })
    })

    describe('#acceptToken', () => {
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

      it('check if token is present', done => {
        randomStorage(web3).then(storage => {
          let r = receiver.build(web3, '0xdeadbeaf', storage)
          return r.whenValidPayment(payment).then(token => {
            return r.acceptToken(token)
          }).then(isPresent => {
            assert(isPresent)
          })
        }).then(done)
      })

      it('check if token is absent', done => {
        let randomToken = support.randomInteger().toString()
        randomStorage(web3).then(storage => {
          let r = receiver.build(web3, '0xdeadbeaf', storage)
          return r.acceptToken(randomToken).then(isPresent => {
            assert.equal(isPresent, false)
          })
        }).then(done)
      })
    })

    describe('#ensureCanAcceptPayment', () => {
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

      it('throw an error if can not', () => {
        randomStorage().then(storage => {
          let r = receiver.build('0xdeadbeaf', storage)
          assert.throws(() => {
            r.ensureCanAcceptPayment(payment)
          }, Error)
        })
      })
    })

    describe('#acceptPayment', () => {
      let channelId = support.randomChannelId()
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

      it('accept new payment, and return a token', done => {
        randomStorage(web3).then(storage => {
          let r = receiver.build(web3, receiverAccount, storage)
          return r.acceptPayment(payment).then(token => {
            assert.notEqual(token, null)
          })
        }).then(done)
      })
    })
  })
})
