import * as support from './support'
import * as receiver from '../lib/receiver'
import * as channel from '../lib/channel'
import Payment from '../lib/Payment'
import * as BigNumber from 'bignumber.js'
import Storage from '../lib/storage'
import Web3 = require('web3')

let expect = require('expect')

const engineName = process.env.ENGINE_NAME || 'nedb'

describe('receiver', () => {
  let storage: Storage
  let web3: Web3
  beforeEach(() => {
    web3 = support.fakeWeb3()

    return support.randomStorage(web3, engineName).then((value: Storage) => {
      storage = value
    }).then(() => {
      return storage.engine.drop()
    })
  })

  afterEach(() => {
    return storage.close()
  })

  describe('.build', () => {
    it('build Receiver', () => {
      let result = receiver.build(support.fakeWeb3(), '0xdeadbeaf', storage)
      expect(typeof result).toBe('object')
    })
  })

  describe('Receiver', () => {
    describe('#findPaymentChannel', () => {
      it('find a channel if saved before', () => {
        let channelId = support.randomChannelId()
        let payment = new Payment({
          channelId: channelId.toString(),
          sender: 'sender',
          receiver: 'receiver',
          price: new BigNumber.BigNumber(10),
          value: new BigNumber.BigNumber(12),
          channelValue: new BigNumber.BigNumber(10),
          meta: 'metaexample',
          v: 1,
          r: '0x2',
          s: '0x3',
          token: undefined
        })

        let paymentChannel = channel.PaymentChannel.fromPayment(payment)

        return storage.channels.save(paymentChannel).then(() => {
          return receiver.build(web3, '0xdeadbeaf', storage).findPaymentChannel(payment)
        }).then((found: channel.PaymentChannel | null) => {
          if (!found) {
            throw new Error('Expected to find a channel.')
          }

          expect(found.channelId).toBe(channelId.toString())
          expect(found.sender).toBe(payment.sender)
          expect(found.receiver).toBe(payment.receiver)
        })
      })
    })

    describe('#findPaymentChannel', () => {
      it('return null if not channel present', () => {
        let channelId = support.randomChannelId()
        let payment = new Payment({
          channelId: channelId.toString(),
          sender: 'sender',
          receiver: 'receiver',
          price: new BigNumber.BigNumber(10),
          value: new BigNumber.BigNumber(12),
          channelValue: new BigNumber.BigNumber(10),
          meta: 'metaexample',
          v: 1,
          r: '0x2',
          s: '0x3',
          token: undefined
        })

        return receiver.build(web3, '0xdeadbeaf', storage).findPaymentChannel(payment).then(found => {
          expect(found).toBeNull()
        })
      })
    })

    describe('#whenValidPayment', () => {
      let channelId = support.randomChannelId()
      let payment = new Payment({
        channelId: channelId.toString(),
        sender: 'sender',
        receiver: 'receiver',
        price: new BigNumber.BigNumber(10),
        value: new BigNumber.BigNumber(12),
        channelValue: new BigNumber.BigNumber(10),
        meta: 'metaexample',
        v: 1,
        r: '0x2',
        s: '0x3',
        token: undefined
      })

      it('return token', () => {
        return receiver.build(web3, '0xdeadbeaf', storage).whenValidPayment(payment).then(token => {
          expect(token).not.toBeNull()
        })
      })

      it('save payment', () => {
        return receiver.build(web3, '0xdeadbeaf', storage).whenValidPayment(payment).then(() => {
          return storage.payments.firstMaximum(payment.channelId)
        }).then(savedPayment => {
          if (savedPayment === null) {
            throw new Error('payment should not be null')
          }

          expect(savedPayment.channelId).toBe(payment.channelId)
          expect(savedPayment.sender).toBe(payment.sender)
          expect(savedPayment.receiver).toBe(payment.receiver)
          expect(savedPayment.price).toEqual(payment.price)
          expect(savedPayment.value).toEqual(payment.value)
          expect(savedPayment.channelValue).toEqual(payment.channelValue)
          expect(savedPayment.v).toBe(payment.v)
          expect(savedPayment.r).toBe(payment.r)
          expect(savedPayment.s).toBe(payment.s)
        })
      })

      it('save token', () => {
        return receiver.build(web3, '0xdeadbeaf', storage).whenValidPayment(payment).then(token => {
          return storage.tokens.isPresent(token)
        }).then(isPresent => {
          expect(isPresent).toBeTruthy()
        })
      })
    })

    describe('#acceptToken', () => {
      let channelId = support.randomChannelId()
      let payment = new Payment({
        channelId: channelId.toString(),
        sender: 'sender',
        receiver: 'receiver',
        price: new BigNumber.BigNumber(10),
        value: new BigNumber.BigNumber(12),
        channelValue: new BigNumber.BigNumber(10),
        meta: 'metaexample',
        v: 1,
        r: '0x2',
        s: '0x3',
        token: undefined
      })

      it('check if token is present', () => {
        let r = receiver.build(web3, '0xdeadbeaf', storage)
        return r.whenValidPayment(payment).then(token => {
          return r.acceptToken(token)
        }).then(isPresent => {
          expect(isPresent).toBeTruthy()
        })
      })

      it('check if token is absent', () => {
        let randomToken = support.randomInteger().toString()
        let r = receiver.build(web3, '0xdeadbeaf', storage)
        return r.acceptToken(randomToken).then(isPresent => {
          expect(isPresent).toBeFalsy()
        })
      })
    })

    describe('#ensureCanAcceptPayment', () => {
      let channelId = support.randomChannelId()
      let payment = new Payment({
        channelId: channelId.toString(),
        sender: 'sender',
        receiver: 'receiver',
        price: new BigNumber.BigNumber(10),
        value: new BigNumber.BigNumber(12),
        channelValue: new BigNumber.BigNumber(10),
        meta: 'metaexample',
        v: 1,
        r: '0x2',
        s: '0x3',
        token: undefined
      })

      it.skip('throw an error if can not', () => {
        let r = receiver.build(web3, '0xdeadbeaf', storage)
        expect(() => {
          r.ensureCanAcceptPayment(payment)
        }).toThrow()
      })
    })

    describe('#acceptPayment', () => {
      let channelId = support.randomChannelId()
      let receiverAccount = '0xdeadbeaf'
      let payment = new Payment({
        channelId: channelId.toString(),
        sender: 'sender',
        receiver: receiverAccount,
        price: new BigNumber.BigNumber(10),
        value: new BigNumber.BigNumber(12),
        channelValue: new BigNumber.BigNumber(10),
        meta: 'metaexample',
        v: 1,
        r: '0x2',
        s: '0x3',
        token: undefined
      })

      it('accept new payment, and return a token', () => {
        let r = receiver.build(web3, receiverAccount, storage)
        return r.acceptPayment(payment).then(token => {
          expect(token).not.toBeNull()
        })
      })
    })
  })
})
