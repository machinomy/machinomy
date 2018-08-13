import * as Web3 from 'web3'
import { BigNumber } from 'bignumber.js'
import * as sinon from 'sinon'
import ChannelContract from './ChannelContract'
import Signature from './Signature'
import * as expect from 'expect'
import * as asPromised from 'chai-as-promised'
import * as chai from 'chai'

chai.use(asPromised)

const ID = '0e29e61f256b40b2a6280f8181a1b5ff'
const SETTLEMENT_PERIOD = new BigNumber(1234)
const RECEIVER = '0xRECEIVER'
const VALUE = new BigNumber(10)
const SENDER = '0xSENDER'
const TOKEN_CONTRACT = '0x01e1a2626271c7267Dd8F506503AD0318776EF69'
const SIGNATURE = Signature.fromRpcSig('SIGNATURE')

describe('ChannelContract', () => {
  const web3 = {
    currentProvider: {}
  } as Web3

  let ethUnidirectional = {} as any
  let tokenUnidirectional = {} as any
  let channelsDatabase = {} as any
  let contract: ChannelContract

  beforeEach(() => {
    contract = new ChannelContract(web3, channelsDatabase, ethUnidirectional, tokenUnidirectional)
  })

  describe('#open', () => {
    it('eth: opens a channel with the correct id, sender, receiver, settlement period, price, and gas params', async () => {
      ethUnidirectional.open = sinon.stub()
      await contract.open(SENDER, RECEIVER, VALUE, SETTLEMENT_PERIOD, ID)
      expect(ethUnidirectional.open.calledWith(SENDER, RECEIVER, VALUE, SETTLEMENT_PERIOD, ID)).toBeTruthy()
    })

    it('tokens: opens a channel with the correct id, sender, receiver, settlement period, tokenContract, price, and gas params', async () => {
      tokenUnidirectional.open = sinon.stub()
      await contract.open(SENDER, RECEIVER, VALUE, SETTLEMENT_PERIOD, ID, TOKEN_CONTRACT)
      expect(tokenUnidirectional.open.calledWith(SENDER, RECEIVER, VALUE, SETTLEMENT_PERIOD, TOKEN_CONTRACT, ID)).toBeTruthy()
    })
  })

  describe('#claim', () => {
    it('eth: claims the channel', async () => {
      ethUnidirectional.claim = sinon.stub()
      channelsDatabase.firstById = async () => {
        return { tokenContract: undefined }
      }
      await contract.claim(RECEIVER, ID, VALUE, SIGNATURE)
      expect(ethUnidirectional.claim.calledWith(RECEIVER, ID, VALUE, SIGNATURE)).toBeTruthy()
    })

    it('tokens: claims the channel', async () => {
      tokenUnidirectional.claim = sinon.stub()
      channelsDatabase.firstById = async () => {
        return { tokenContract: TOKEN_CONTRACT }
      }
      await contract.claim(RECEIVER, ID, VALUE, SIGNATURE)
      expect(tokenUnidirectional.claim.calledWith(RECEIVER, ID, VALUE, SIGNATURE)).toBeTruthy()
    })
  })

  describe('#deposit', () => {
    it('eth: deposits money into the channel', async () => {
      ethUnidirectional.deposit = sinon.stub()
      await contract.deposit(SENDER, ID, VALUE)
      expect(ethUnidirectional.deposit.calledWith(SENDER, ID, VALUE)).toBeTruthy()
    })

    it('tokens: deposits tokens into the channel', async () => {
      tokenUnidirectional.deposit = sinon.stub()
      await contract.deposit(SENDER, ID, VALUE, TOKEN_CONTRACT)
      expect(tokenUnidirectional.deposit.calledWith(SENDER, ID, VALUE, TOKEN_CONTRACT)).toBeTruthy()
    })
  })

  describe('#getState', () => {
    it('calls eth contract if tokenContract is empty', async () => {
      ethUnidirectional.getState = sinon.stub()
      channelsDatabase.firstById = async () => {
        return { tokenContract: undefined }
      }
      await contract.getState(ID)
      expect(ethUnidirectional.getState.calledWith(ID)).toBeTruthy()
    })

    it('calls token contract if tokenContract is filled', async () => {
      tokenUnidirectional.getState = sinon.stub()
      channelsDatabase.firstById = async () => {
        return { tokenContract: TOKEN_CONTRACT }
      }
      await contract.getState(ID)
      expect(tokenUnidirectional.getState.calledWith(ID)).toBeTruthy()
    })
  })

  describe('#startSettle', () => {
    it('eth: starts settling the channel', async () => {
      ethUnidirectional.startSettle = sinon.stub()
      channelsDatabase.firstById = async () => {
        return { tokenContract: undefined }
      }
      await contract.startSettle(SENDER, ID)
      expect(ethUnidirectional.startSettle.calledWith(SENDER, ID)).toBeTruthy()
    })

    it('tokens: starts settling the channel', async () => {
      tokenUnidirectional.startSettle = sinon.stub()
      channelsDatabase.firstById = async () => {
        return { tokenContract: TOKEN_CONTRACT }
      }
      await contract.startSettle(SENDER, ID)
      expect(tokenUnidirectional.startSettle.calledWith(SENDER, ID)).toBeTruthy()
    })
  })

  describe('#finishSettle', () => {
    it('eth: finishes settling the channel', async () => {
      ethUnidirectional.finishSettle = sinon.stub()
      channelsDatabase.firstById = async () => {
        return { tokenContract: undefined }
      }
      await contract.finishSettle(SENDER, ID)
      expect(ethUnidirectional.finishSettle.calledWith(SENDER, ID)).toBeTruthy()
    })

    it('tokens: finishes settling the channel', async () => {
      tokenUnidirectional.finishSettle = sinon.stub()
      channelsDatabase.firstById = async () => {
        return { tokenContract: TOKEN_CONTRACT }
      }
      await contract.finishSettle(SENDER, ID)
      expect(tokenUnidirectional.finishSettle.calledWith(SENDER, ID)).toBeTruthy()
    })
  })

  describe('#paymentDigest', () => {
    it('eth: returns the digest', async () => {
      ethUnidirectional.paymentDigest = sinon.stub()
      channelsDatabase.firstById = async () => {
        return { tokenContract: undefined }
      }
      await contract.paymentDigest(ID, VALUE)
      expect(ethUnidirectional.paymentDigest.calledWith(ID, VALUE)).toBeTruthy()
    })

    it('tokens: returns the digest', async () => {
      tokenUnidirectional.paymentDigest = sinon.stub()
      channelsDatabase.firstById = async () => {
        return { tokenContract: TOKEN_CONTRACT }
      }
      await contract.paymentDigest(ID, VALUE)
      expect(tokenUnidirectional.paymentDigest.calledWith(ID, VALUE)).toBeTruthy()
    })

    it('not found: throw error', async () => {
      channelsDatabase.firstById = async () => {
        return null
      }
      return chai.assert.isRejected(contract.paymentDigest(ID, VALUE))
    })
  })

  describe('#canClaim', () => {
    it('eth: returns whether the user can claim', async () => {
      ethUnidirectional.canClaim = sinon.stub()
      channelsDatabase.firstById = async () => {
        return { tokenContract: undefined }
      }
      await contract.canClaim(ID, VALUE, RECEIVER, SIGNATURE)
      expect(ethUnidirectional.canClaim.calledWith(ID, VALUE, RECEIVER, SIGNATURE)).toBeTruthy()
    })

    it('tokens: returns whether the user can claim', async () => {
      tokenUnidirectional.canClaim = sinon.stub()
      channelsDatabase.firstById = async () => {
        return { tokenContract: TOKEN_CONTRACT }
      }
      await contract.canClaim(ID, VALUE, RECEIVER, SIGNATURE)
      expect(tokenUnidirectional.canClaim.calledWith(ID, VALUE, RECEIVER, SIGNATURE)).toBeTruthy()
    })

    it('try ethContract if not found', async () => {
      channelsDatabase.firstById = async () => {
        return null
      }
      ethUnidirectional.canClaim = sinon.stub().returns(true)
      let result = contract.canClaim(ID, VALUE, RECEIVER, SIGNATURE)
      expect(result).toBeTruthy()
    })
  })
})
