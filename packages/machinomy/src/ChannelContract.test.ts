import * as Web3 from 'web3'
import * as uuid from 'uuid'
import * as BigNumber from 'bignumber.js'
import * as sinon from 'sinon'
import { Unidirectional, TokenUnidirectional } from '@machinomy/contracts'
import * as contracts from '../../contracts/lib'
import ChannelContract from './ChannelContract'
import ChannelEthContract from './ChannelEthContract'
import ChannelTokenContract from './ChannelTokenContract'
import Signature from './Signature'
import IChannelsDatabase from './storage/IChannelsDatabase'

const expect = require('expect')

describe('ChannelContract', () => {
  const ID = '0e29e61f256b40b2a6280f8181a1b5ff'

  const SIG = Signature.fromRpcSig('0xd8a923b39ae82bb39d3b64d58f06e1d776bcbcae34e5b4a6f4a952e8892e6a5b4c0f88833c06fe91729057035161e599fda536e8ce0ab4be2c214d6ea961e93a01')

  let web3: Web3
  let deployed: any
  let deployedToken: any
  let contractStub: sinon.SinonStub
  let tokenContractStub: sinon.SinonStub
  let uuidStub: sinon.SinonStub
  let contract: ChannelContract

  beforeEach(() => {
    web3 = {
      currentProvider: {}
    } as Web3

    deployed = {} as any
    deployedToken = {} as any

    uuidStub = sinon.stub(uuid, 'v4').returns('0e29e61f-256b-40b2-a628-0f8181a1b5ff')

    contractStub = sinon.stub(Unidirectional, 'contract')
    contractStub.withArgs(web3.currentProvider).returns({
      deployed: sinon.stub().resolves(Promise.resolve(deployed))
    })

    tokenContractStub = sinon.stub(TokenUnidirectional, 'contract')
    tokenContractStub.withArgs(web3.currentProvider).returns({
      deployed: sinon.stub().resolves(Promise.resolve(deployed))
    })
    const channelEthContract = new ChannelEthContract(web3)
    const channelTokenContract = new ChannelTokenContract(web3)
    contract = new ChannelContract(web3, {} as IChannelsDatabase, channelEthContract, channelTokenContract)
  })

  afterEach(() => {
    contractStub.restore()
    uuidStub.restore()
  })

  describe('#open', () => {
    it('eth: opens a channel with the correct id, sender, receiver, settlement period, price, and gas params', () => {
      deployed.open = sinon.stub()
      let settlementPeriod = new BigNumber.BigNumber(1234)
      return contract.channelEthContract.open('send', 'recv', new BigNumber.BigNumber(10), settlementPeriod, ID).then(() => {
        expect(deployed.open.calledWith(ID, 'recv', settlementPeriod, {
          from: 'send',
          value: new BigNumber.BigNumber(10),
          gas: 300000
        })).toBe(true)
      })
    })

    it('tokens: opens a channel with the correct id, sender, receiver, settlement period, tokenContract, price, and gas params', () => {
      deployedToken.open = sinon.stub()
      let settlementPeriod = new BigNumber.BigNumber(1234)
      return contract.channelTokenContract.open('send', 'recv', new BigNumber.BigNumber(10), settlementPeriod, '0x1234', ID).then(transactionResult => {
        expect(deployedToken.open.calledWith(ID, 'recv', settlementPeriod, '0x1234', {
          from: 'send',
          value: new BigNumber.BigNumber(10),
          gas: 300000
        })).toBe(true)

        expect(contracts.StandardToken.isApprovalEvent(transactionResult.logs[0])).toBe(true)
      })
    })
  })

  describe('#claim', () => {
    it('eth: claims the channel', () => {
      deployed.claim = sinon.stub()
      return contract.channelEthContract.claim('recv', ID, new BigNumber.BigNumber(10), SIG).then(() => {
        expect(deployed.claim.calledWith(ID, new BigNumber.BigNumber(10), SIG.toString(), {
          from: 'recv'
        })).toBe(true)
      })
    })

    it('tokens: claims the channel', () => {
      deployedToken.claim = sinon.stub()
      return contract.channelTokenContract.claim('recv', ID, new BigNumber.BigNumber(10), SIG).then(() => {
        expect(deployedToken.claim.calledWith(ID, new BigNumber.BigNumber(10), SIG.toString(), {
          from: 'recv'
        })).toBe(true)
      })
    })
  })

  describe('#deposit', () => {
    it('eth: deposits money into the channel', () => {
      deployed.deposit = sinon.stub()
      return contract.channelEthContract.deposit('send', ID, new BigNumber.BigNumber(10)).then(() => {
        expect(deployed.deposit.calledWith(ID, {
          from: 'send',
          value: new BigNumber.BigNumber(10),
          gas: 300000
        })).toBe(true)
      })
    })

    it('tokens: deposits tokens into the channel', () => {
      deployedToken.deposit = sinon.stub()
      return contract.channelTokenContract.deposit('send', ID, new BigNumber.BigNumber(10), '0x1234').then(transactionResult => {
        expect(deployedToken.deposit.calledWith(ID, {
          from: 'send',
          value: new BigNumber.BigNumber(10),
          gas: 300000
        })).toBe(true)
        expect(contracts.StandardToken.isApprovalEvent(transactionResult.logs[0])).toBe(true)
      })
    })
  })

  describe('#getState', () => {
    it('eth: returns 0 if the channel is open', () => {
      deployed.isOpen = sinon.stub().withArgs(ID).resolves(true)
      deployed.isSettling = sinon.stub().withArgs(ID).resolves(false)

      return contract.channelEthContract.getState(ID).then((state: number) => {
        expect(state).toBe(0)
      })
    })

    it('eth: returns 1 if the channel is settling', () => {
      deployed.isOpen = sinon.stub().withArgs(ID).resolves(false)
      deployed.isSettling = sinon.stub().withArgs(ID).resolves(true)

      return contract.channelEthContract.getState(ID).then((state: number) => {
        expect(state).toBe(1)
      })
    })

    it('tokens: returns 0 if the channel is open', () => {
      deployedToken.isOpen = sinon.stub().withArgs(ID).resolves(true)
      deployedToken.isSettling = sinon.stub().withArgs(ID).resolves(false)

      return contract.channelTokenContract.getState(ID).then((state: number) => {
        expect(state).toBe(0)
      })
    })

    it('tokens: returns 1 if the channel is settling', () => {
      deployed.isOpen = sinon.stub().withArgs(ID).resolves(false)
      deployed.isSettling = sinon.stub().withArgs(ID).resolves(true)

      return contract.channelTokenContract.getState(ID).then((state: number) => {
        expect(state).toBe(1)
      })
    })
  })

  describe('#startSettle', () => {
    it('eth: starts settling the channel', () => {
      deployed.startSettling = sinon.stub()

      return contract.channelEthContract.startSettle('acc', ID).then(() => {
        expect(deployed.startSettling.calledWith(ID, { from: 'acc' })).toBe(true)
      })
    })

    it('tokens: starts settling the channel', () => {
      deployed.startSettling = sinon.stub()

      return contract.channelTokenContract.startSettle('acc', ID).then(() => {
        expect(deployed.startSettling.calledWith(ID, { from: 'acc' })).toBe(true)
      })
    })
  })

  describe('#finishSettle', () => {
    it('eth: finishes settling the channel', () => {
      deployed.settle = sinon.stub()

      return contract.channelEthContract.finishSettle('acc', ID).then(() => {
        expect(deployed.settle.calledWith(ID, { from: 'acc', gas: 400000 })).toBe(true)
      })
    })

    it('tokens: finishes settling the channel', () => {
      deployed.settle = sinon.stub()

      return contract.channelTokenContract.finishSettle('acc', ID).then(() => {
        expect(deployed.settle.calledWith(ID, { from: 'acc', gas: 400000 })).toBe(true)
      })
    })
  })

  describe('#paymentDigest', () => {
    it('eth: returns the digest', () => {
      deployed.paymentDigest = sinon.stub().withArgs(ID, new BigNumber.BigNumber(10)).resolves('digest')

      return contract.channelEthContract.paymentDigest(ID, new BigNumber.BigNumber(10)).then((digest: string) => {
        expect(digest).toBe('digest')
      })
    })

    it('tokens: returns the digest', () => {
      deployed.paymentDigest = sinon.stub().withArgs(ID, new BigNumber.BigNumber(10)).resolves('digest')

      return contract.channelTokenContract.paymentDigest(ID, new BigNumber.BigNumber(10), '0x1234').then((digest: string) => {
        expect(digest).toBe('digest')
      })
    })
  })

  describe('#canClaim', () => {
    it('eth: returns whether the user can claim', () => {
      const sig = Signature.fromParts({
        v: 27,
        r: '0x01',
        s: '0x02'
      })

      deployed.canClaim = sinon.stub().withArgs(ID, new BigNumber.BigNumber(10), 'recv', sig.toString()).resolves(true)

      return contract.channelEthContract.canClaim(ID, new BigNumber.BigNumber(10), 'recv', sig).then((val: boolean) => {
        expect(val).toBe(true)
      })
    })

    it('tokens: returns whether the user can claim', () => {
      const sig = Signature.fromParts({
        v: 27,
        r: '0x01',
        s: '0x02'
      })

      deployed.canClaim = sinon.stub().withArgs(ID, new BigNumber.BigNumber(10), 'recv', sig.toString()).resolves(true)

      return contract.channelTokenContract.canClaim(ID, new BigNumber.BigNumber(10), 'recv', sig).then((val: boolean) => {
        expect(val).toBe(true)
      })
    })
  })
})
