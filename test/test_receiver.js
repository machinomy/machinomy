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
      console.log('PENDING') // FIXME
    })
  })
})
