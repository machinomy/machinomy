import * as support from './support'
import * as sender from '../lib/sender'
import * as transport from '../lib/transport'
import * as channel from '../lib/channel'
import { randomStorage } from './support'

import Promise = require('bluebird')

const randomSender = (): Promise<sender.Sender> => {
  let web3 = support.fakeWeb3()
  return randomStorage(web3).then(storage => {
    return new sender.Sender(web3, '0xdeadbeaf', channel.contract(web3), transport.build(), storage)
  })
}

describe('sender', () => {
  describe('.build', () => {
    it('build Sender instance', () => {
      return randomSender().then(s => {
        expect(typeof s).toBe('object')
      })
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
        r: '0x2',
        s: '0x3'
      })
      let paymentRequired = new transport.PaymentRequired(payment.receiver, payment.price, 'gateway')
      it('determine if channel can be used', done => {
        let paymentChannel = channel.PaymentChannel.fromPayment(payment)
        randomSender().then(s => {
          expect(s.canUseChannel(paymentChannel, paymentRequired)).toBeTruthy()
        }).then(done)
      })
    })
  })
})
