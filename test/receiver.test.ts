import * as support from './support'
import * as receiver from '../lib/receiver'
import * as channel from '../lib/channel'
import { randomStorage } from './support'
import { PaymentChannel } from '../lib/channel'
import Payment from '../lib/Payment'
import mongo from '../lib/mongo'
import * as BigNumber from 'bignumber.js'
let expect = require('expect')

const engineName = process.env.ENGINE_NAME || 'nedb'

describe('receiver', () => {
  before((done) => {
    if (process.env.ENGINE_NAME === 'mongo') {
      mongo.connectToServer().then(() => {
        done()
      }).catch((e: Error) => {
        console.log(e)
      })
    } else {
      done()
    }
  })

  beforeEach((done) => {
    if (process.env.ENGINE_NAME === 'mongo') {
      mongo.db().dropDatabase(() => {
        done()
      })
    } else {
      done()
    }
  })

  after((done) => {
    if (process.env.ENGINE_NAME === 'mongo') {
      mongo.db().close()
    }
    done()
  })

  let web3 = support.fakeWeb3()

  describe('.build', () => {
    it('build Receiver', done => {
      randomStorage(web3, engineName).then(storage => {
        let result = receiver.build(support.fakeWeb3(), '0xdeadbeaf', storage)
        expect(typeof result).toBe('object')
      }).then(done)
    })
  })

  describe('Receiver', () => {
    let web3 = support.fakeWeb3()

    describe('#findPaymentChannel', () => {
      it('find a channel if saved before', done => {
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
          s: '0x3'
        })
        let paymentChannel = channel.PaymentChannel.fromPayment(payment)
        randomStorage(web3, engineName).then(storage => {
          return storage.channels.save(paymentChannel).then(() => {
            return receiver.build(web3, '0xdeadbeaf', storage).findPaymentChannel(payment)
          }).then((found: PaymentChannel|null) => {
            expect(found).not.toBeNull()
            if (found) {
              expect(found.channelId).toBe(channelId.toString())
              expect(found.sender).toBe(payment.sender)
              expect(found.receiver).toBe(payment.receiver)
            }
          })
        }).then(done)
      })
    })
    describe('#findPaymentChannel', () => {
      it('return null if not channel present', done => {
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
          s: '0x3'
        })
        randomStorage(web3, engineName).then(storage => {
          return receiver.build(web3, '0xdeadbeaf', storage).findPaymentChannel(payment).then(found => {
            expect(found).toBeNull()
          })
        }).then(done)
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
        s: '0x3'
      })
      it('return token', done => {
        randomStorage(web3, engineName).then(storage => {
          return receiver.build(web3, '0xdeadbeaf', storage).whenValidPayment(payment).then(token => {
            expect(token).not.toBeNull()
          })
        }).then(done)
      })

      it('save payment', () => {
        return randomStorage(web3, engineName).then(storage => {
          return receiver.build(web3, '0xdeadbeaf', storage).whenValidPayment(payment).then(() => {
            return storage.payments.firstMaximum(payment.channelId)
          }).then(savedPayment => {
            // console.log(savedPayment)
            expect(savedPayment).not.toBeNull()
            if (savedPayment) {
              expect(payment.channelId).toBe(savedPayment.channelId)
              expect(payment.sender).toBe(savedPayment.sender)
              expect(payment.receiver).toBe(savedPayment.receiver)
              expect(payment.price).toEqual(savedPayment.price)
              expect(payment.value).toEqual(savedPayment.value)
              expect(payment.channelValue).toEqual(savedPayment.channelValue)
              expect(payment.v).toBe(savedPayment.v)
              expect(payment.r).toBe(savedPayment.r)
              expect(payment.s).toBe(savedPayment.s)
            }
          })
        })
      })

      it('save token', done => {
        randomStorage(web3, engineName).then(storage => {
          return receiver.build(web3, '0xdeadbeaf', storage).whenValidPayment(payment).then(token => {
            return storage.tokens.isPresent(token)
          }).then(isPresent => {
            expect(isPresent).toBeTruthy()
          })
        }).then(done)
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
        s: '0x3'
      })

      it('check if token is present', done => {
        randomStorage(web3, engineName).then(storage => {
          let r = receiver.build(web3, '0xdeadbeaf', storage)
          return r.whenValidPayment(payment).then(token => {
            return r.acceptToken(token)
          }).then(isPresent => {
            expect(isPresent).toBeTruthy()
          })
        }).then(done)
      })

      it('check if token is absent', done => {
        let randomToken = support.randomInteger().toString()
        randomStorage(web3, engineName).then(storage => {
          let r = receiver.build(web3, '0xdeadbeaf', storage)
          return r.acceptToken(randomToken).then(isPresent => {
            expect(isPresent).toBeFalsy()
          })
        }).then(done)
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
        s: '0x3'
      })

      it('throw an error if can not', () => {
        randomStorage(web3, engineName).then(storage => {
          let r = receiver.build(web3, '0xdeadbeaf', storage)
          expect(() => {
            r.ensureCanAcceptPayment(payment)
          }).toThrow()
        })
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
        s: '0x3'
      })

      it('accept new payment, and return a token', done => {
        randomStorage(web3, engineName).then(storage => {
          let r = receiver.build(web3, receiverAccount, storage)
          return r.acceptPayment(payment).then(token => {
            expect(token).not.toBeNull()
          })
        }).then(done)
      })
    })
  })
})
