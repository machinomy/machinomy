import Web3 = require('web3')
import uuid = require('uuid')
import * as BigNumber from 'bignumber.js'
import * as sinon from 'sinon'
import { Unidirectional } from '@machinomy/contracts'
import ChannelContract from '../lib/channel_contract'
import Signature from '../lib/signature'

const expect = require('expect')

describe('ChannelContract', () => {
  const ID = '0e29e61f256b40b2a6280f8181a1b5ff'

  const SIG = Signature.fromRpcSig('0xd8a923b39ae82bb39d3b64d58f06e1d776bcbcae34e5b4a6f4a952e8892e6a5b4c0f88833c06fe91729057035161e599fda536e8ce0ab4be2c214d6ea961e93a01')

  let web3: Web3

  let deployed: any

  let contractStub: sinon.SinonStub

  let uuidStub: sinon.SinonStub

  let contract: ChannelContract

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

    contract = new ChannelContract(web3)
  })

  afterEach(() => {
    contractStub.restore()
    uuidStub.restore()
  })

  describe('#open', () => {
    it('opens a channel with the correct id, sender, receiver, settlement period, price, and gas params', () => {
      deployed.open = sinon.stub()
      return contract.open('send', 'recv', new BigNumber.BigNumber(10), 1234).then(() => {
        expect(deployed.open.calledWith(ID, 'recv', 1234, {
          from: 'send',
          value: new BigNumber.BigNumber(10),
          gas: 300000
        })).toBe(true)
      })
    })
  })

  describe('#claim', () => {
    it('claims the channel', () => {
      deployed.claim = sinon.stub()
      return contract.claim('recv', ID, new BigNumber.BigNumber(10), SIG).then(() => {
        expect(deployed.claim.calledWith(ID, new BigNumber.BigNumber(10), SIG.toString(), {
          from: 'recv'
        })).toBe(true)
      })
    })
  })

  describe('#deposit', () => {
    it('deposits money into the channel', () => {
      deployed.deposit = sinon.stub()
      return contract.deposit('send', ID, new BigNumber.BigNumber(10)).then(() => {
        expect(deployed.deposit.calledWith(ID, {
          from: 'send',
          value: new BigNumber.BigNumber(10),
          gas: 300000
        })).toBe(true)
      })
    })
  })

  describe('#getState', () => {
    it('returns 0 if the channel is open', () => {
      deployed.isOpen = sinon.stub().withArgs(ID).resolves(true)
      deployed.isSettling = sinon.stub().withArgs(ID).resolves(false)

      return contract.getState(ID).then((state: number) => {
        expect(state).toBe(0)
      })
    })

    it('returns 1 if the channel is settling', () => {
      deployed.isOpen = sinon.stub().withArgs(ID).resolves(false)
      deployed.isSettling = sinon.stub().withArgs(ID).resolves(true)

      return contract.getState(ID).then((state: number) => {
        expect(state).toBe(1)
      })
    })
  })

  describe('#startSettle', () => {
    it('starts settling the channel', () => {
      deployed.startSettling = sinon.stub()

      return contract.startSettle('acc', ID).then(() => {
        expect(deployed.startSettling.calledWith(ID, { from: 'acc' })).toBe(true)
      })
    })
  })

  describe('#finishSettle', () => {
    it('finishes settling the channel', () => {
      deployed.settle = sinon.stub()

      return contract.finishSettle('acc', ID).then(() => {
        expect(deployed.settle.calledWith(ID, { from: 'acc', gas: 400000 })).toBe(true)
      })
    })
  })

  describe('#paymentDigest', () => {
    it('returns the digest', () => {
      deployed.paymentDigest = sinon.stub().withArgs(ID, new BigNumber.BigNumber(10)).resolves('digest')

      return contract.paymentDigest(ID, new BigNumber.BigNumber(10)).then((digest: string) => {
        expect(digest).toBe('digest')
      })
    })
  })
})
