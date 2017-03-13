'use strict'

const tmp = require('tmp')
const assert = require('assert')
const mocha = require('mocha')
const Promise = require('bluebird')

const sender = require('../lib/sender')
const transport = require('../lib/transport')
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
  let web3 = null // FIXME
  return tmpFileName().then(filename => {
    return storage.build(web3, filename, null, true)
  })
}

/**
 * @return {Promise<Sender>}
 */
const randomSender = () => {
  return randomStorage().then(storage => {
    return sender.build('0xdeadbeaf', channel.contract, transport.build(), storage)
  })
}

describe('sender', () => {
  describe('.build', () => {
    it('build Sender instance', done => {
      randomSender().then(s => {
        assert.equal(typeof s, 'object')
      }).then(done)
    })
  })

  describe('Sender', () => {
    describe('#canUseChannel', () => {
      let channelId = channel.id(Buffer.from(randomInteger().toString()))
      let payment = new channel.Payment({
        channelId: channelId.toString(),
        sender: 'sender',
        receiver: 'receiver',
        price: 1,
        value: 1,
        channelValue: 10,
        v: 1,
        r: 2,
        s: 3
      })
      let paymentRequired = new transport.PaymentRequired(payment.receiver, payment.price, 'gateway')
      it('determine if channel can be used', done => {
        let paymentChannel = channel.PaymentChannel.fromPayment(payment)
        randomSender().then(s => {
          assert(s.canUseChannel(paymentChannel, paymentRequired))
        }).then(done)
      })
    })
  })
})
