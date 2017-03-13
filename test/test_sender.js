'use strict'

const assert = require('assert')

const support = require('./support')

const sender = require('../lib/sender')
const transport = require('../lib/transport')
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

/**
 * @return {Promise<Sender>}
 */
const randomSender = () => {
  let web3 = support.fakeWeb3()
  return randomStorage(web3).then(storage => {
    return sender.build(web3, '0xdeadbeaf', channel.contract(web3), transport.build(), storage)
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
      let channelId = channel.id(Buffer.from(support.randomInteger().toString()))
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
