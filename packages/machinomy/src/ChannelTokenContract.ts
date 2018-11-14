import * as Web3 from 'web3'
import { BigNumber } from 'bignumber.js'
import { TransactionResult } from 'truffle-contract'
import Logger from '@machinomy/logger'
import * as contracts from '@machinomy/contracts'
import Signature from './Signature'
import ChannelId from './ChannelId'
import MemoryCache from './caching/MemoryCache'
import * as abi from 'ethereumjs-abi'
import * as sigUtil from 'eth-sig-util'
import { ChannelState } from './ChannelState'
import ChannelManager from './ChannelManager'

const log = new Logger('channel-token-contract')

const CREATE_CHANNEL_GAS = 300000

type RawChannel = [
  string, // sender
  string, // receiver
  BigNumber, // value
  BigNumber, // settlingPeriod
  BigNumber, // settlingUntil
  string // tokenContract
]

export default class ChannelTokenContract {
  contract: Promise<contracts.TokenUnidirectional.Contract>
  private cache: MemoryCache<RawChannel>

  private web3: Web3

  constructor (web3: Web3, ttl: number) {
    this.web3 = web3
    this.contract = contracts.TokenUnidirectional.contract(this.web3.currentProvider).deployed()
    this.cache = new MemoryCache(ttl)
  }

  async open (sender: string, receiver: string, value: BigNumber | number, settlementPeriod: number | BigNumber, tokenContract: string, channelId?: ChannelId | string): Promise<TransactionResult> {
    log.info(`Creating channel. Value: ${value} / Settlement: ${settlementPeriod}`)
    let _channelId = channelId || ChannelId.random()
    const standardTokenContract = contracts.StandardToken.contract(this.web3.currentProvider).at(tokenContract)
    const deployedTokenUnidirectional = await this.contract
    const deployedStandardTokenContract = await standardTokenContract

    const approveTx = await deployedStandardTokenContract.approve(deployedTokenUnidirectional.address, value, { from: sender })
    if (contracts.StandardToken.isApprovalEvent(approveTx.logs[0])) {
      return deployedTokenUnidirectional.open(_channelId.toString(), receiver, new BigNumber(settlementPeriod), tokenContract, value, {
        from: sender,
        gas: CREATE_CHANNEL_GAS
      })
    } else {
      const errorMessage = `Opening channel. Can not approve tokens hold from sender ${sender} to receiver ${receiver}. Value: ${value}`
      log.error(errorMessage)
      return Promise.reject(errorMessage)
    }

  }

  async claim (receiver: string, channelId: string, value: BigNumber, signature: Signature): Promise<TransactionResult> {
    log.info(`Claiming channel with id ${channelId} on behalf of receiver ${receiver}`)
    log.info(`Values: ${value} / Signature: ${signature.toString()}`)
    const deployed = await this.contract
    return deployed.claim(channelId, value, signature.toString(), { from: receiver, gas: CREATE_CHANNEL_GAS })
  }

  async deposit (sender: string, channelId: string, value: BigNumber, tokenContract: string): Promise<TransactionResult> {
    log.info(`Depositing ${value} into channel ${channelId}`)
    const standardTokenContract = contracts.StandardToken.contract(this.web3.currentProvider).at(tokenContract)
    const deployedTokenUnidirectional = await this.contract
    const deployedStandardTokenContract = await standardTokenContract
    const channel = await this.channelById(channelId)
    if (!channel) throw new Error('Can not deposit to channel not present')
    const receiver = channel[1]
    const approveTx = await deployedStandardTokenContract.approve(receiver, value, { from: sender })
    if (contracts.StandardToken.isApprovalEvent(approveTx.logs[0])) {
      return deployedTokenUnidirectional.deposit(channelId, value, {
        from: sender,
        gas: CREATE_CHANNEL_GAS
      })
    } else {
      const errorMessage = `Deposit operation. Can not approve tokens hold from sender ${sender} to receiver ${receiver}. Value: ${value}`
      log.error(errorMessage)
      return Promise.reject(errorMessage)
    }

  }

  async getState (channelId: string): Promise<number> {
    log.info(`Fetching state for channel ${channelId}`)
    const channel = await this.channelById(channelId)
    if (channel) {
      const settlingPeriod = channel[3]
      const settlingUntil = channel[4]
      log.info(`Fetched state for channel ${channelId}`)
      if (settlingPeriod.gt(0) && settlingUntil.gt(0)) {
        return ChannelState.Settling
      } else if (settlingPeriod.gt(0) && settlingUntil.eq(0)) {
        return ChannelState.Open
      } else {
        return ChannelState.Settled
      }
    } else {
      return ChannelState.Settled
    }
  }

  async getSettlementPeriod (channelId: string): Promise<BigNumber> {
    log.info(`Fetching settlement period for channel ${channelId}`)
    const channel = await this.channelById(channelId)
    if (channel) {
      return channel[3]
    } else {
      return new BigNumber(ChannelManager.DEFAULT_SETTLEMENT_PERIOD)
    }
  }

  async startSettle (account: string, channelId: string): Promise<TransactionResult> {
    log.info(`Starting settle for account ${account} and channel id ${channelId}.`)
    const deployed = await this.contract
    return deployed.startSettling(channelId, { from: account })
  }

  async finishSettle (account: string, channelId: string): Promise<TransactionResult> {
    log.info(`Finishing settle for account ${account} and channel ID ${channelId}.`)
    const deployed = await this.contract
    return deployed.settle(channelId, { from: account, gas: 400000 })
  }

  async paymentDigest (channelId: string, value: BigNumber, tokenContract: string): Promise<string> {
    const deployed = await this.contract
    const digest = abi.soliditySHA3(['address', 'bytes32', 'uint256', 'address'],
      [deployed.address, channelId, value.toString(), tokenContract])
    return '0x' + digest.toString('hex')
  }

  async canClaim (channelId: string, payment: BigNumber, receiver: string, signature: Signature): Promise<boolean> {
    const channel = await this.channelById(channelId)
    if (!channel) return false

    const sender = channel[0]
    const tokenAddress = channel[5]

    let digest = await this.paymentDigest(channelId, payment, tokenAddress)
    let recovered = sigUtil.recoverPersonalSignature({
      data: digest,
      sig: signature
    })
    return recovered === sender
  }

  async channelById (channelId: string): Promise<RawChannel | undefined> {
    const cached = await this.cache.get(channelId)
    if (cached) {
      return cached
    } else {
      const deployed = await this.contract

      const exists = await deployed.isPresent(channelId)
      if (!exists) return undefined

      const instance = await deployed.channels(channelId)
      await this.cache.set(channelId, instance)
      return instance
    }
  }
}
