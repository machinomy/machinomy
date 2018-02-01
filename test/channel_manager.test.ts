import * as sinon from 'sinon'
// line below is false positive
// tslint:disable-next-line
import * as BigNumber from 'bignumber.js'
import ChannelManager, { ChannelManagerImpl } from '../lib/channel_manager'
import ChannelsDatabase from '../lib/storages/channels_database'
import { ChannelContract } from '../lib/channel'
import { PaymentChannel } from '../lib/paymentChannel'
import { DEFAULT_SETTLEMENT_PERIOD } from '../lib/sender'
import { PaymentRequired } from '../lib/transport'
import PaymentsDatabase from '../lib/storages/payments_database'
import TokensDatabase from '../lib/storages/tokens_database'
import { TransactionResult } from 'truffle-contract'
import Payment from '../lib/Payment'
import Web3 = require('web3')
import expectsRejection from './util/expects_rejection'

const expect = require('expect')

describe('ChannelManagerImpl', () => {
  const fakeChan = new PaymentChannel('0xcafe', '0xbeef', '123', new BigNumber.BigNumber(10), new BigNumber.BigNumber(0), 0, undefined)

  let web3: Web3

  let channelsDao: ChannelsDatabase

  let paymentsDao: PaymentsDatabase

  let tokensDao: TokensDatabase

  let channelContract: ChannelContract

  let manager: ChannelManager

  beforeEach(() => {
    web3 = {} as Web3
    paymentsDao = {} as PaymentsDatabase
    tokensDao = {} as TokensDatabase
    channelsDao = {} as ChannelsDatabase
    channelContract = {} as ChannelContract
    manager = new ChannelManagerImpl('0xcafe', web3, channelsDao, paymentsDao, tokensDao, channelContract)
  })

  describe('openChannel', () => {
    beforeEach(() => {
      channelsDao.save = sinon.stub().resolves()
      channelContract.buildPaymentChannel = sinon.stub().resolves(fakeChan)
    })

    it('puts a new channel on the blockchain', () => {
      return manager.openChannel('0xcafe', '0xbeef', new BigNumber.BigNumber(10))
        .then(() => {
          expect((channelContract.buildPaymentChannel as sinon.SinonStub)
            .calledWith('0xcafe', sinon.match.instanceOf(PaymentRequired), new BigNumber.BigNumber(100), DEFAULT_SETTLEMENT_PERIOD))
            .toBe(true)
        })
    })

    it('saves the new payment channel in the database', () => {
      return manager.openChannel('0xcafe', '0xbeef', new BigNumber.BigNumber(10))
        .then(() => {
          expect((channelsDao.save as sinon.SinonStub).calledWith(fakeChan)).toBe(true)
        })
    })

    it('emits willOpenChannel and didOpenChannel', () => {
      const will = sinon.stub()
      const did = sinon.stub()

      manager.addListener('willOpenChannel', will)
      manager.addListener('didOpenChannel', did)

      const promise = manager.openChannel('0xcafe', '0xbeef', new BigNumber.BigNumber(10))
      expect(will.calledWith('0xcafe', '0xbeef', new BigNumber.BigNumber(100))).toBe(true)
      expect(did.called).toBe(false)
      return promise.then(() => {
        expect(did.calledWith(fakeChan)).toBe(true)
      })
    })

    it('only allows one call at once', () => {
      const order: number[] = []

      return Promise.all([
        manager.openChannel('0xcafe', '0xbeef', new BigNumber.BigNumber(10)).then(() => order.push(1)),
        manager.openChannel('0xcafe', '0xbeef', new BigNumber.BigNumber(10)).then(() => order.push(2)),
        manager.openChannel('0xcafe', '0xbeef', new BigNumber.BigNumber(10)).then(() => order.push(3))
      ]).then(() => expect(order).toEqual([1, 2, 3]))
    })
  })

  describe('closeChannel', () => {
    const id = '0xbeef'

    const startSettleResult = {} as TransactionResult

    const finishSettleResult = {} as TransactionResult

    const claimResult = {} as TransactionResult

    beforeEach(() => {
      channelContract.startSettle = sinon.stub().resolves(startSettleResult)
      channelContract.finishSettle = sinon.stub().resolves(finishSettleResult)
    })

    it('throws an error when no channels are found', () => {
      channelsDao.firstById = sinon.stub().resolves([])
      return expectsRejection(manager.closeChannel('nope'))
    })

    it('throws an error if the channel is already settled', () => {
      channelContract.getState = sinon.stub().resolves(2)
      return expectsRejection(manager.closeChannel(id))
    })

    it('starts settling the contract when the sender is the current account and state is 0', () => {
      const channel = new PaymentChannel('0xcafe', '0xbeef', id, new BigNumber.BigNumber(1), new BigNumber.BigNumber(0), 0, undefined)
      channelsDao.firstById = sinon.stub().withArgs(id).resolves(channel)
      channelContract.getState = sinon.stub().resolves(0)
      channelsDao.updateState = sinon.stub().withArgs(id, 1).resolves()

      return manager.closeChannel(id).then((res: TransactionResult) => {
        expect(res).toBe(startSettleResult)
        expect((channelsDao.updateState as sinon.SinonStub).calledWith(id, 1)).toBe(true)
      })
    })

    it('finishes settling the contract when the sender is the current account and state is 1', () => {
      const channel = new PaymentChannel('0xcafe', '0xbeef', id, new BigNumber.BigNumber(1), new BigNumber.BigNumber(0), 1, undefined)
      channelsDao.firstById = sinon.stub().withArgs(id).resolves(channel)
      channelContract.getState = sinon.stub().resolves(1)
      channelsDao.updateState = sinon.stub().withArgs(id, 2).resolves()

      return manager.closeChannel(id).then((res: TransactionResult) => {
        expect(res).toBe(finishSettleResult)
        expect((channelsDao.updateState as sinon.SinonStub).calledWith(id, 2)).toBe(true)
      })
    })

    it('claims the contract when the sender is not the current account', () => {
      const channel = new PaymentChannel('0xdead', '0xbeef', id, new BigNumber.BigNumber(1), new BigNumber.BigNumber(0), 1, undefined)
      channelsDao.firstById = sinon.stub().withArgs(id).resolves(channel)
      paymentsDao.firstMaximum = sinon.stub().withArgs(id).resolves(new Payment({
        channelId: id,
        sender: channel.sender,
        receiver: channel.receiver,
        price: channel.spent,
        value: channel.value,
        channelValue: channel.value,
        v: 1,
        r: '0x01',
        s: '0x02',
        meta: '',
        token: undefined
      }))
      channelContract.claim = sinon.stub().withArgs(channel.receiver, channel, channel.value, 1, '0x01', '0x02')
        .resolves(claimResult)
      channelsDao.updateState = sinon.stub().withArgs(id, 2).resolves()

      return manager.closeChannel(id).then((res: TransactionResult) => {
        expect(res).toBe(claimResult)
        expect((channelsDao.updateState as sinon.SinonStub).calledWith(id, 2)).toBe(true)
      })
    })

    it('emits willCloseChannel and didCloseChannel', () => {
      const channel = new PaymentChannel('0xcafe', '0xbeef', id, new BigNumber.BigNumber(1), new BigNumber.BigNumber(0), 0, undefined)
      channelsDao.firstById = sinon.stub().withArgs(id).resolves(channel)
      channelContract.getState = sinon.stub().resolves(0)
      channelsDao.updateState = sinon.stub().withArgs(id, 1).resolves()

      const will = sinon.stub()
      const did = sinon.stub()
      manager.addListener('willCloseChannel', will)
      manager.addListener('didCloseChannel', did)

      return manager.closeChannel(id).then((res: TransactionResult) => {
        expect(will.calledWith(channel)).toBe(true)
        expect(did.calledWith(channel)).toBe(true)
      })
    })

    it('only allows one call at once', () => {
      const channel = new PaymentChannel('0xcafe', '0xbeef', id, new BigNumber.BigNumber(1), new BigNumber.BigNumber(0), 0, undefined)
      channelsDao.firstById = sinon.stub().withArgs(id).resolves(channel)
      channelContract.getState = sinon.stub().resolves(0)
      channelsDao.updateState = sinon.stub().withArgs(id, 1).resolves()

      const order: number[] = []

      return Promise.all([
        manager.closeChannel('0xcafe').then(() => order.push(1)),
        manager.closeChannel('0xcafe').then(() => order.push(2)),
        manager.closeChannel('0xcafe').then(() => order.push(3))
      ]).then(() => expect(order).toEqual([1,2,3]))
    })
  })

  describe('nextPayment', () => {
    const id = '0xdead'

    let channel: PaymentChannel

    beforeEach(() => {
      channel = new PaymentChannel('0xcafe', '0xbeef', id, new BigNumber.BigNumber(10), new BigNumber.BigNumber(2), 0, undefined)
      channelsDao.firstById = sinon.stub().withArgs(id).resolves(channel)
    })

    it('should throw an error if no channel is found', () => {
      return expectsRejection(manager.nextPayment(id, new BigNumber.BigNumber(6), ''))
    })

    it('should throw an error if the amount to spend is more than the remaining channel value', () => {
      return expectsRejection(manager.nextPayment(id, new BigNumber.BigNumber(9), ''))
    })

    it('should return a new payment whose spend is the sum of the existing spend plus amount', () => {
      const fakePayment = {} as Payment
      sinon.stub(Payment, 'fromPaymentChannel').withArgs(web3, channel, sinon.match.object).resolves(fakePayment)
      return manager.nextPayment(id, new BigNumber.BigNumber(8), '').then((payment: Payment) => {
        expect(payment).toBe(fakePayment)
        expect((Payment.fromPaymentChannel as sinon.SinonStub).lastCall.args[2].price).toEqual(new BigNumber.BigNumber(10))
      })
    })
  })

  describe('acceptPayment', () => {
    let channel: PaymentChannel

    let payment: Payment

    beforeEach(() => {
      const id = '0xdead'

      payment = {
        channelId: id,
        sender: '0xcafe',
        receiver: '0xbeef',
        price: new BigNumber.BigNumber(1),
        value: new BigNumber.BigNumber(2),
        channelValue: new BigNumber.BigNumber(10),
        v: 1,
        r: '0x01',
        s: '0x02',
        meta: '',
        contractAddress: undefined,
        token: ''
      } as Payment

      channel = new PaymentChannel('0xcafe', '0xbeef', id, new BigNumber.BigNumber(10), new BigNumber.BigNumber(2), 0, undefined)
    })

    it('should throw an error if no channels exist', () => {
      channelsDao.findBySenderReceiverChannelId = sinon.stub().resolves([])
      return expectsRejection(manager.acceptPayment(payment))
    })

    it('should throw an error if the payment is invalid', () => {
      payment.price = new BigNumber.BigNumber(100)
      channelsDao.findBySenderReceiverChannelId = sinon.stub().resolves([channel])
      return expectsRejection(manager.acceptPayment(payment))
    })

    it('should save the payment to the database and return the token when valid', () => {
      web3.sha3 = sinon.stub().returns('token')
      channelsDao.findBySenderReceiverChannelId = sinon.stub().resolves([channel])
      channelsDao.saveOrUpdate = sinon.stub().withArgs(channelsDao).resolves()
      tokensDao.save = sinon.stub().withArgs('token', payment.channelId).resolves()
      paymentsDao.save = sinon.stub().withArgs('token', payment).resolves()

      return manager.acceptPayment(payment).then((token: string) => {
        expect(token).toBe('token')
      })
    })
  })

  describe('requireOpenChannel', () => {
    beforeEach(() => {
      channelsDao.save = sinon.stub().resolves()
      channelContract.buildPaymentChannel = sinon.stub().resolves(fakeChan)
    })

    it('returns any usable channels if found', () => {
      channelsDao.findUsable = sinon.stub().resolves(fakeChan)

      return manager.requireOpenChannel('0xcafe', '0xbeef', new BigNumber.BigNumber(10))
        .then((chan: PaymentChannel) => {
          expect(chan).toEqual(fakeChan)
          expect((channelContract.buildPaymentChannel as sinon.SinonStub).called).toBe(false)
        })
    })

    it('creates a new channel if no usable channels are found', () => {
      channelsDao.findUsable = sinon.stub().resolves(null)

      return manager.requireOpenChannel('0xcafe', '0xbeef', new BigNumber.BigNumber(10))
        .then((chan: PaymentChannel) => {
          expect(chan).toEqual(fakeChan)
          expect((channelContract.buildPaymentChannel as sinon.SinonStub).called).toBe(true)
          expect((channelsDao.save as sinon.SinonStub).calledWith(fakeChan)).toBe(true)
        })
    })
  })
})
