import * as sinon from 'sinon'
import * as BigNumber from 'bignumber.js'
import ChannelEthContract from './ChannelEthContract'
import ChannelTokenContract from './ChannelTokenContract'
import { PaymentChannel } from './PaymentChannel'
import TokensDatabase from './storage/postgresql/PostgresTokensDatabase'
import { TransactionResult } from 'truffle-contract'
import Payment from './payment'
import * as Web3 from 'web3'
import expectsRejection from './util/expects_rejection'
import PaymentManager from './PaymentManager'
import ChannelContract from './ChannelContract'
import MachinomyOptions from './MachinomyOptions'
import * as uuid from 'uuid'
import { Unidirectional } from '@machinomy/contracts'
import IChannelsDatabase from './storage/IChannelsDatabase'
import IPaymentsDatabase from './storage/IPaymentsDatabase'
import IChannelManager from './IChannelManager'
import ChannelManager from './ChannelManager'
import * as expect from 'expect'
import Signature from './Signature'

describe('ChannelManager', () => {
  const fakeChan = new PaymentChannel('0xcafe', '0xbeef', '123', new BigNumber.BigNumber(10), new BigNumber.BigNumber(0), 0, '', ChannelManager.DEFAULT_SETTLEMENT_PERIOD)

  const fakeLog = {
    logs: [{
      args: {
        channelId: '123'
      }
    }]
  }

  let web3: Web3

  let channelsDao: IChannelsDatabase

  let paymentsDao: IPaymentsDatabase

  let tokensDao: TokensDatabase

  let channelContract: ChannelContract

  let channelManager: IChannelManager

  let paymentManager: PaymentManager

  let deployed: any

  let contractStub: sinon.SinonStub

  let uuidStub: sinon.SinonStub

  let machOpts: MachinomyOptions

  beforeEach(() => {
    web3 = {
      currentProvider: {}
    } as Web3

    deployed = {} as any

    uuidStub = sinon.stub(uuid, 'v4').returns('0e29e61f-256b-40b2-a628-0f8181a1b5ff')

    contractStub = sinon.stub(Unidirectional, 'contract')
    contractStub.withArgs(web3.currentProvider).returns({
      deployed: sinon.stub().resolves(deployed)
    })

    paymentsDao = {} as IPaymentsDatabase
    tokensDao = {} as TokensDatabase
    channelsDao = {} as IChannelsDatabase
    paymentManager = {} as PaymentManager

    machOpts = {
      settlementPeriod: ChannelManager.DEFAULT_SETTLEMENT_PERIOD + 1,
      closeOnInvalidPayment: true
    } as MachinomyOptions

    // const channelEthContract = new ChannelEthContract(web3)
    // const channelTokenContract = new ChannelTokenContract(web3)
    const channelEthContract = {} as ChannelEthContract
    const channelTokenContract = {} as ChannelTokenContract
    channelContract = new ChannelContract(web3, channelsDao, channelEthContract, channelTokenContract)
    channelManager = new ChannelManager('0xcafe', web3, channelsDao, paymentsDao, tokensDao, channelContract, paymentManager, machOpts)
    channelEthContract.getSettlementPeriod = sinon.stub().resolves(ChannelManager.DEFAULT_SETTLEMENT_PERIOD)
    channelTokenContract.getSettlementPeriod = sinon.stub().resolves(ChannelManager.DEFAULT_SETTLEMENT_PERIOD)
  })

  afterEach(() => {
    contractStub.restore()
    uuidStub.restore()
  })

  describe('openChannel', () => {
    beforeEach(() => {
      channelsDao.save = sinon.stub().resolves()
      channelContract.open = sinon.stub().resolves(fakeLog)
    })

    it('puts a new channel on the blockchain', () => {
      return channelManager.openChannel('0xcafe', '0xbeef', new BigNumber.BigNumber(10))
        .then(() => {
          expect((channelContract.open as sinon.SinonStub)
            .calledWith('0xcafe', '0xbeef', new BigNumber.BigNumber(100), ChannelManager.DEFAULT_SETTLEMENT_PERIOD + 1))
            .toBe(true)
        })
    })

    it('saves the new payment channel in the database', () => {
      return channelManager.openChannel('0xcafe', '0xbeef', new BigNumber.BigNumber(1))
        .then(() => {
          expect((channelsDao.save as sinon.SinonStub).calledWith(fakeChan)).toBe(true)
        })
    })

    it('emits willOpenChannel and didOpenChannel', async () => {
      let n = 0
      channelManager.addListener('willOpenChannel', () => {
        expect(n).toBe(0)
        n += 1
      })
      channelManager.addListener('didOpenChannel', () => {
        expect(n).toBe(1)
      })

      await channelManager.openChannel(fakeChan.sender, fakeChan.receiver, fakeChan.value)
    })

    it('only allows one call at once', () => {
      const order: number[] = []

      return Promise.all([
        channelManager.openChannel('0xcafe', '0xbeef', new BigNumber.BigNumber(10)).then(() => order.push(1)),
        channelManager.openChannel('0xcafe', '0xbeef', new BigNumber.BigNumber(10)).then(() => order.push(2)),
        channelManager.openChannel('0xcafe', '0xbeef', new BigNumber.BigNumber(10)).then(() => order.push(3))
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
      deployed.channels = sinon.stub().resolves(['0', '0',
        new BigNumber.BigNumber(10), new BigNumber.BigNumber(0), new BigNumber.BigNumber(0)])
    })

    it('throws an error when no channels are found', () => {
      channelsDao.firstById = sinon.stub().resolves(null)
      channelContract.channelById = sinon.stub().resolves(Promise.resolve([]))
      return expectsRejection(channelManager.closeChannel('nope'))
    })

    it('throws an error if the channel is already settled', () => {
      channelsDao.firstById = sinon.stub().resolves(fakeChan)
      channelContract.getState = sinon.stub().resolves(2)
      channelContract.channelById = sinon.stub().withArgs(id).resolves([fakeChan.sender, fakeChan.receiver, fakeChan.value, ChannelManager.DEFAULT_SETTLEMENT_PERIOD, 0])
      return expectsRejection(channelManager.closeChannel(id))
    })

    it('starts settling the contract when the sender is the current account and state is 0', () => {
      const channel = new PaymentChannel('0xcafe', '0xbeef', id, new BigNumber.BigNumber(1), new BigNumber.BigNumber(0), 0, '')
      channelsDao.firstById = sinon.stub().withArgs(id).resolves(channel)
      channelContract.getState = sinon.stub().resolves(0)
      channelContract.channelById = sinon.stub().withArgs(id).resolves([fakeChan.sender, fakeChan.receiver, fakeChan.value, ChannelManager.DEFAULT_SETTLEMENT_PERIOD, 0])
      channelsDao.updateState = sinon.stub().withArgs(id, 1).resolves()

      return channelManager.closeChannel(id).then((res: TransactionResult) => {
        expect(res).toBe(startSettleResult)
        expect((channelsDao.updateState as sinon.SinonStub).calledWith(id, 1)).toBe(true)
      })
    })

    it('finishes settling the contract when the sender is the current account and state is 1', () => {
      const channel = new PaymentChannel('0xcafe', '0xbeef', id, new BigNumber.BigNumber(1), new BigNumber.BigNumber(0), 1, '')
      channelsDao.firstById = sinon.stub().withArgs(id).resolves(channel)
      channelContract.getState = sinon.stub().resolves(1)
      channelContract.channelById = sinon.stub().withArgs(id).resolves([fakeChan.sender, fakeChan.receiver, fakeChan.value, ChannelManager.DEFAULT_SETTLEMENT_PERIOD, 0])
      channelsDao.updateState = sinon.stub().withArgs(id, 2).resolves()

      return channelManager.closeChannel(id).then((res: TransactionResult) => {
        expect(res).toBe(finishSettleResult)
        expect((channelsDao.updateState as sinon.SinonStub).calledWith(id, 2)).toBe(true)
      })
    })

    it('claims the contract when the sender is not the current account', () => {
      const channel = new PaymentChannel('0xdead', '0xbeef', id, new BigNumber.BigNumber(1), new BigNumber.BigNumber(0), 1, '')
      channelsDao.firstById = sinon.stub().withArgs(id).resolves(channel)
      channelContract.channelById = sinon.stub().withArgs(id).resolves([fakeChan.sender, fakeChan.receiver, fakeChan.value, ChannelManager.DEFAULT_SETTLEMENT_PERIOD, 0])
      paymentsDao.firstMaximum = sinon.stub().withArgs(id).resolves(new Payment({
        channelId: id,
        sender: channel.sender,
        receiver: channel.receiver,
        price: channel.spent,
        value: channel.value,
        channelValue: channel.value,
        signature: Signature.fromParts({
          v: 27,
          r: '0x01',
          s: '0x02'
        }),
        meta: '',
        token: undefined,
        tokenContract: ''
      }))
      channelContract.claim = sinon.stub().withArgs(channel.receiver, channel, channel.value, 1, '0x01', '0x02')
        .resolves(claimResult)
      channelsDao.updateState = sinon.stub().withArgs(id, 2).resolves()

      return channelManager.closeChannel(id).then((res: TransactionResult) => {
        expect(res).toBe(claimResult)
        expect((channelsDao.updateState as sinon.SinonStub).calledWith(id, 2)).toBe(true)
      })
    })

    it('emits willCloseChannel and didCloseChannel', () => {
      const channel = new PaymentChannel('0xcafe', '0xbeef', id, new BigNumber.BigNumber(1), new BigNumber.BigNumber(0), 0, '')
      channelsDao.firstById = sinon.stub().withArgs(id).resolves(channel)
      channelContract.getState = sinon.stub().resolves(0)
      channelContract.channelById = sinon.stub().withArgs(id).resolves([fakeChan.sender, fakeChan.receiver, fakeChan.value, ChannelManager.DEFAULT_SETTLEMENT_PERIOD, 0])
      channelsDao.updateState = sinon.stub().withArgs(id, 1).resolves()

      const will = sinon.stub()
      const did = sinon.stub()
      channelManager.addListener('willCloseChannel', will)
      channelManager.addListener('didCloseChannel', did)

      return channelManager.closeChannel(id).then((res: TransactionResult) => {
        expect(will.calledWith(channel)).toBe(true)
        expect(did.calledWith(channel)).toBe(true)
      })
    })

    it('only allows one call at once', () => {
      const channel = new PaymentChannel('0xcafe', '0xbeef', id, new BigNumber.BigNumber(1), new BigNumber.BigNumber(0), 0, '')
      channelsDao.firstById = sinon.stub().withArgs(id).resolves(channel)
      channelContract.getState = sinon.stub().resolves(0)
      channelsDao.updateState = sinon.stub().withArgs(id, 1).resolves()
      channelContract.channelById = sinon.stub().withArgs(id).resolves([fakeChan.sender, fakeChan.receiver, fakeChan.value, ChannelManager.DEFAULT_SETTLEMENT_PERIOD, 0])

      const order: number[] = []

      return Promise.all([
        channelManager.closeChannel(id).then(() => order.push(1)),
        channelManager.closeChannel(id).then(() => order.push(2)),
        channelManager.closeChannel(id).then(() => order.push(3))
      ]).then(() => expect(order).toEqual([1, 2, 3]))
    })

    describe('not in DB but on-chain channels', () => {
      let savedChannel: PaymentChannel

      function setup (settlingUntil: number) {
        savedChannel = new PaymentChannel('0xcafe', '0xbeef', id, new BigNumber.BigNumber(1), new BigNumber.BigNumber(0), 0, '')
        channelsDao.firstById = sinon.stub().withArgs(id).resolves(null)
        channelContract.channelById = sinon.stub().withArgs(id).resolves([savedChannel.sender, savedChannel.receiver, savedChannel.value, ChannelManager.DEFAULT_SETTLEMENT_PERIOD, new BigNumber.BigNumber(settlingUntil)])
        channelContract.claim = sinon.stub().resolves(claimResult)
        channelsDao.save = sinon.stub().resolves()
        channelContract.getState = sinon.stub().resolves(0)
        channelsDao.updateState = sinon.stub().withArgs(id, 1).resolves()
      }

      beforeEach(() => {
        setup(0)
        return channelManager.closeChannel(id)
      })

      it('should close channels that exist on-chain but not in the database', () => {
        expect((channelContract.channelById as sinon.SinonStub).calledWith(id))
      })

      it('should save the channel in the database', () => {
        expect((channelsDao.save as sinon.SinonStub).lastCall.args[0]).toEqual(savedChannel)
      })

      it('should set the state correctly based on the settlingUntil parameter', async () => {
        setup(1)
        await channelManager.closeChannel(id)
        expect((channelsDao.save as sinon.SinonStub).lastCall.args[0])
          .toEqual(new PaymentChannel('0xcafe', '0xbeef', id, new BigNumber.BigNumber(1), new BigNumber.BigNumber(0), 1, ''))
      })
    })
  })

  describe('deposit', () => {
    let id = '0xdead'

    beforeEach(() => {
      deployed.channels = sinon.stub().resolves(['0', '0',
        new BigNumber.BigNumber(10), new BigNumber.BigNumber(0), new BigNumber.BigNumber(0)])
    })

    it('should throw an error if no channel is found', () => {
      channelsDao.firstById = sinon.stub().withArgs(id).resolves(null)
      channelContract.channelById = sinon.stub().resolves(Promise.resolve([]))
      return expectsRejection(channelManager.deposit(id, new BigNumber.BigNumber(6)))
    })

    it('should not update the database if depositing into the channel contract fails', () => {
      channelsDao.firstById = sinon.stub().withArgs(id).resolves({} as PaymentChannel)
      channelsDao.deposit = sinon.stub()
      channelContract.channelById = sinon.stub().withArgs(id).resolves([fakeChan.sender, fakeChan.receiver, fakeChan.value, ChannelManager.DEFAULT_SETTLEMENT_PERIOD, 0])
      channelContract.deposit = sinon.stub().rejects('oh no')

      return expectsRejection(channelManager.deposit(id, new BigNumber.BigNumber(1))).then(() => {
        expect((channelsDao.deposit as sinon.SinonStub).notCalled).toBe(true)
      })
    })

    it('should return a transaction receipt on success', () => {
      const value = new BigNumber.BigNumber(10)
      channelsDao.firstById = sinon.stub().withArgs(id).resolves({} as PaymentChannel)
      channelsDao.deposit = sinon.stub().withArgs('0xcafe', id, new BigNumber.BigNumber(10)).resolves()
      channelContract.channelById = sinon.stub().withArgs(id).resolves([fakeChan.sender, fakeChan.receiver, fakeChan.value, ChannelManager.DEFAULT_SETTLEMENT_PERIOD, 0])
      channelContract.deposit = sinon.stub().resolves({ tx: '123abc' } as TransactionResult)

      return channelManager.deposit(id, value).then((res: TransactionResult) => {
        expect(res.tx).toEqual('123abc')
      })
    })
  })

  describe('nextPayment', () => {
    const id = '0xdead'

    let channel: PaymentChannel

    beforeEach(() => {
      channel = new PaymentChannel('0xcafe', '0xbeef', id, new BigNumber.BigNumber(10), new BigNumber.BigNumber(2), 0, '')
      channelsDao.firstById = sinon.stub().withArgs(id).resolves(channel)
      deployed.channels = sinon.stub().resolves(['0', '0',
        new BigNumber.BigNumber(8), new BigNumber.BigNumber(0), new BigNumber.BigNumber(0)])
    })

    it('should throw an error if no channel is found', () => {
      channelsDao.firstById = sinon.stub().withArgs(id).resolves(null)
      channelContract.channelById = sinon.stub().resolves(Promise.resolve([]))
      return expectsRejection(channelManager.nextPayment(id, new BigNumber.BigNumber(6), ''))
    })

    it('should throw an error if the amount to spend is more than the remaining channel value', () => {
      channelContract.channelById = sinon.stub().withArgs(id).resolves([fakeChan.sender, fakeChan.receiver, fakeChan.value, ChannelManager.DEFAULT_SETTLEMENT_PERIOD, 0])
      return expectsRejection(channelManager.nextPayment(id, new BigNumber.BigNumber(9), ''))
    })

    it('should return a new payment whose spend is the sum of the existing spend plus amount', () => {
      channelContract.channelById = sinon.stub().withArgs(id).resolves([fakeChan.sender, fakeChan.receiver, fakeChan.value, ChannelManager.DEFAULT_SETTLEMENT_PERIOD, 0])
      paymentManager.buildPaymentForChannel = sinon.stub().withArgs(channel, sinon.match.object, sinon.match.object, '').callsFake((channel: PaymentChannel, price: BigNumber.BigNumber, value: BigNumber.BigNumber, meta: string) => {
        return new Payment({
          channelId: channel.channelId,
          sender: 'send',
          receiver: 'recv',
          price,
          value,
          channelValue: new BigNumber.BigNumber(100),
          signature: Signature.fromParts({
            v: 27,
            r: '0x01',
            s: '0x02'
          }),
          meta,
          tokenContract: '',
          token: undefined
        })
      })

      deployed.channels = sinon.stub().resolves(['0', '0',
        new BigNumber.BigNumber(10), new BigNumber.BigNumber(0), new BigNumber.BigNumber(0)])

      return channelManager.nextPayment(id, new BigNumber.BigNumber(8), '').then((payment: Payment) => {
        expect(payment.value.eq(new BigNumber.BigNumber(10))).toBe(true)
        expect(payment.price.eq(new BigNumber.BigNumber(8))).toBe(true)
      })
    })
  })

  describe('spendChannel', () => {
    it('should save the channel in the database', async () => {
      const payment = new Payment({
        channelId: '0xdead',
        sender: 'send',
        receiver: 'recv',
        price: new BigNumber.BigNumber(10),
        value: new BigNumber.BigNumber(10),
        channelValue: new BigNumber.BigNumber(100),
        signature: Signature.fromParts({
          v: 27,
          r: '0x01',
          s: '0x02'
        }),
        meta: '',
        tokenContract: '',
        token: undefined
      })

      channelsDao.saveOrUpdate = sinon.stub().resolves()
      paymentsDao.save = sinon.stub().resolves()

      await channelManager.spendChannel(payment)

      expect((channelsDao.saveOrUpdate as sinon.SinonStub).calledWith({
        sender: 'send',
        receiver: 'recv',
        channelId: '0xdead',
        value: new BigNumber.BigNumber(10),
        spent: new BigNumber.BigNumber(10),
        state: undefined,
        tokenContract: undefined
      }))

      expect((paymentsDao.save as sinon.SinonStub).called)
    })
  })

  describe('acceptPayment', () => {
    let payment: Payment

    beforeEach(() => {
      const id = '0xdead'

      payment = {
        channelId: id,
        sender: '0xcafe',
        receiver: '0xbeef',
        price: new BigNumber.BigNumber(1),
        value: new BigNumber.BigNumber(1),
        channelValue: new BigNumber.BigNumber(10),
        signature: Signature.fromParts({
          v: 27,
          r: '0x01',
          s: '0x02'
        }),
        meta: '',
        tokenContract: '',
        token: ''
      } as Payment

      deployed.channels = sinon.stub().resolves(['0', '0',
        new BigNumber.BigNumber(8), new BigNumber.BigNumber(0), new BigNumber.BigNumber(0)])

      channelsDao.findBySenderReceiverChannelId = sinon.stub().resolves(null)
    })

    it('should save the payment to the database and return the token when valid', () => {
      web3.sha3 = sinon.stub().returns('token')
      channelsDao.saveOrUpdate = sinon.stub().withArgs(channelsDao).resolves()
      tokensDao.save = sinon.stub().withArgs('token', payment.channelId).resolves()
      paymentsDao.save = sinon.stub().withArgs('token', payment).resolves()
      paymentManager.isValid = sinon.stub().resolves(true)

      return channelManager.acceptPayment(payment).then((token: string) => {
        expect(token).toBe('token')
      })
    })

    function testNextPayment () {
      const signature = Signature.fromParts({
        v: 27,
        r: '0x02',
        s: '0x03'
      })

      const newChan = {
        ...fakeChan,
        sender: '0xbeef',
        channelId: '456'
      }

      paymentManager.isValid = sinon.stub().resolves(false)
      channelsDao.findBySenderReceiverChannelId = sinon.stub().resolves(newChan)
      paymentsDao.firstMaximum = sinon.stub().resolves({
        price: new BigNumber.BigNumber(1),
        value: new BigNumber.BigNumber(0.5),
        signature
      })
      channelContract.claim = sinon.stub().resolves({})
      channelContract.getState = sinon.stub().resolves(0)
      channelContract.channelById = sinon.stub().resolves([fakeChan.sender, fakeChan.receiver, fakeChan.value, ChannelManager.DEFAULT_SETTLEMENT_PERIOD, 0])
      channelsDao.updateState = sinon.stub().resolves()
      channelsDao.firstById = sinon.stub().withArgs(newChan.channelId).resolves(newChan)

      return expectsRejection(channelManager.acceptPayment(payment))
        .then(() => ({ signature, newChan }))
    }

    it('should close the channel if the payment is invalid and a channel exists', () => {
      return testNextPayment()
        .then((res: { signature: Signature, newChan: any }) => expect((channelContract.claim as sinon.SinonStub)
          .calledWith(fakeChan.receiver, res.newChan.channelId, new BigNumber.BigNumber(0.5), res.signature)).toBe(true))
    })

    it('should not close the channel if options.closeOnInvalidPayment is false', () => {
      machOpts.closeOnInvalidPayment = false

      return testNextPayment()
        .then(() => expect((channelContract.claim as sinon.SinonStub).notCalled).toBe(true))
    })
  })

  describe('requireOpenChannel', () => {
    beforeEach(() => {
      channelsDao.save = sinon.stub().resolves()
      channelContract.open = sinon.stub().resolves(fakeLog)
    })

    it('returns any usable channels if found', () => {
      channelsDao.findUsable = sinon.stub().resolves(fakeChan)

      return channelManager.requireOpenChannel('0xcafe', '0xbeef', new BigNumber.BigNumber(1))
        .then((chan: PaymentChannel) => {
          expect(chan).toEqual(fakeChan)
          expect((channelContract.open as sinon.SinonStub).called).toBe(false)
        })
    })

    it('creates a new channel if no usable channels are found', () => {
      channelsDao.findUsable = sinon.stub().resolves(null)

      return channelManager.requireOpenChannel('0xcafe', '0xbeef', new BigNumber.BigNumber(1))
        .then((chan: PaymentChannel) => {
          const fakeChan2 = {
            ...fakeChan,
            settlementPeriod: fakeChan.settlementPeriod - 1
          }
          expect(chan).toEqual(fakeChan2)
          expect((channelContract.open as sinon.SinonStub).called).toBe(true)
          expect((channelsDao.save as sinon.SinonStub).calledWith(fakeChan2)).toBe(true)
        })
    })
  })
})
