import * as support from './support'
import Sender from '../lib/sender'
import * as transport from '../lib/transport'
import * as channel from '../lib/channel'
import { randomStorage } from './support'
import Payment from '../lib/Payment'
import Promise = require('bluebird')
import BigNumber from 'bignumber.js'
const engineName = process.env.ENGINE_NAME || 'nedb'
let expect = require('expect')

const randomSender = (): Promise<Sender> => {
  let web3 = support.fakeWeb3()
  return randomStorage(web3, engineName).then(storage => {
    return new Sender(web3, '0xdeadbeaf', channel.contract(web3), transport.build(), storage)
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
      let payment = new Payment({
        channelId: channelId.toString(),
        sender: 'sender',
        receiver: 'receiver',
        price: new BigNumber(1),
        value: new BigNumber(1),
        channelValue: new BigNumber(10),
        meta: 'metaexample',
        v: 1,
        r: '0x2',
        s: '0x3'
      })
      let paymentRequired = new transport.PaymentRequired(payment.receiver, payment.price, 'meta', 'gateway')
      it('determine if channel can be used', done => {
        let paymentChannel = channel.PaymentChannel.fromPayment(payment)
        randomSender().then(s => {
          expect(s.canUseChannel(paymentChannel, paymentRequired)).toBeTruthy()
        }).then(done)
      })
    })
  })
})
