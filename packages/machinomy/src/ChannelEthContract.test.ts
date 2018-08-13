import * as Web3 from 'web3'
import { BigNumber } from 'bignumber.js'
import * as sinon from 'sinon'
import * as contracts from '@machinomy/contracts'
import ChannelEthContract from './ChannelEthContract'
import Signature from './Signature'
import * as expect from 'expect'
import ChannelId from './ChannelId'

const ID = '0e29e61f256b40b2a6280f8181a1b5ff'
const RANDOM_ID = 'RANDOM'
const SETTLEMENT_PERIOD = new BigNumber(1234)
const RECEIVER = '0xRECEIVER'
const VALUE = new BigNumber(10)
const SENDER = '0xSENDER'
const SIG = Signature.fromRpcSig('0xd8a923b39ae82bb39d3b64d58f06e1d776bcbcae34e5b4a6f4a952e8892e6a5b4c0f88833c06fe91729057035161e599fda536e8ce0ab4be2c214d6ea961e93a01')

describe('ChannelEthContract', () => {
  const web3 = { currentProvider: {} } as Web3

  let deployed: any
  let contractStub: sinon.SinonStub
  let contract: ChannelEthContract
  let channelIdStub: sinon.SinonStub

  beforeEach(() => {
    channelIdStub = sinon.stub(ChannelId, 'random').returns(RANDOM_ID)

    deployed = {} as any

    contractStub = sinon.stub(contracts.Unidirectional, 'contract')
    contractStub.withArgs(web3.currentProvider).returns({
      deployed: sinon.stub().resolves(Promise.resolve(deployed))
    })

    contract = new ChannelEthContract(web3)
  })

  afterEach(() => {
    contractStub.restore()
    channelIdStub.restore()
  })

  describe('#open', () => {
    specify('call contract', async () => {
      deployed.open = sinon.stub()
      await contract.open(SENDER, RECEIVER, VALUE, SETTLEMENT_PERIOD, ID)
      expect(deployed.open.calledWith(ID, RECEIVER, SETTLEMENT_PERIOD, {
        from: SENDER,
        value: VALUE,
        gas: 300000
      })).toBeTruthy()
    })
  })

  describe('#claim', () => {
    it('eth: claims the channel', async () => {
      deployed.claim = sinon.stub()
      await contract.claim(RECEIVER, ID, VALUE, SIG)

      expect(deployed.claim.calledWith(ID, VALUE, SIG.toString(), {
        from: RECEIVER
      })).toBeTruthy()
    })
  })

  describe('#deposit', () => {
    it('eth: deposits money into the channel', async () => {
      deployed.deposit = sinon.stub()
      await contract.deposit(SENDER, ID, VALUE)
      expect(deployed.deposit.calledWith(ID, {
        from: SENDER,
        value: VALUE,
        gas: 300000
      })).toBeTruthy()
    })
  })

  describe('#getState', () => {
    it('eth: returns 0 if the channel is open', async () => {
      deployed.isOpen = sinon.stub().withArgs(ID).resolves(true)
      deployed.isSettling = sinon.stub().withArgs(ID).resolves(false)

      let state = await contract.getState(ID)
      expect(state).toBe(0)
    })

    it('eth: returns 1 if the channel is settling', async () => {
      deployed.isOpen = sinon.stub().withArgs(ID).resolves(false)
      deployed.isSettling = sinon.stub().withArgs(ID).resolves(true)

      let state = await contract.getState(ID)
      expect(state).toBe(1)
    })
  })

  describe('#startSettle', () => {
    it('eth: starts settling the channel', async () => {
      deployed.startSettling = sinon.stub()

      await contract.startSettle('acc', ID)
      expect(deployed.startSettling.calledWith(ID, { from: 'acc' })).toBeTruthy()
    })
  })

  describe('#finishSettle', () => {
    it('eth: finishes settling the channel', async () => {
      deployed.settle = sinon.stub()
      await contract.finishSettle('acc', ID)
      expect(deployed.settle.calledWith(ID, { from: 'acc', gas: 400000 })).toBeTruthy()
    })
  })

  describe('#paymentDigest', () => {
    it('eth: returns the digest', async () => {
      deployed.paymentDigest = sinon.stub().withArgs(ID, VALUE).resolves('digest')

      let digest = await contract.paymentDigest(ID, VALUE)
      expect(digest).toBe('digest')
    })
  })

  describe('#canClaim', () => {
    it('eth: returns whether the user can claim', async () => {
      deployed.canClaim = sinon.stub().withArgs(ID, VALUE, RECEIVER, SIG.toString()).resolves(true)

      let canClaim = await contract.canClaim(ID, VALUE, RECEIVER, SIG)
      expect(canClaim).toBeTruthy()
    })
  })
})
