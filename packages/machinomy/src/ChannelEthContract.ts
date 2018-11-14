import * as Web3 from 'web3'
import { BigNumber } from 'bignumber.js'
import { TransactionResult } from 'truffle-contract'
import Logger from '@machinomy/logger'
import ChannelManager from './ChannelManager'
import { ChannelState } from './ChannelState'
import Signature from './Signature'
import { Unidirectional } from '@machinomy/contracts'
import ChannelId from './ChannelId'
import * as abi from 'ethereumjs-abi'
import * as sigUtil from 'eth-sig-util'
import MemoryCache from './caching/MemoryCache'

const log = new Logger('channel-eth-contract')

const CREATE_CHANNEL_GAS = 300000

type Raw = [
  string, // sender
  string, // receiver
  BigNumber, // value
  BigNumber, // settlingPeriod
  BigNumber // settlingUntil
]

export default class ChannelEthContract {
  contract: Promise<Unidirectional.Contract>

  private web3: Web3
  private cache: MemoryCache<Raw>

  constructor (web3: Web3, ttl: number) {
    this.web3 = web3
    this.contract = Unidirectional.contract(this.web3.currentProvider).deployed()
    this.cache = new MemoryCache(ttl)
  }

  async open (sender: string, receiver: string, price: BigNumber, settlementPeriod: number | BigNumber, channelId?: ChannelId | string): Promise<TransactionResult> {
    log.info(`Creating channel. Value: ${price} / Settlement: ${settlementPeriod}`)
    let _channelId = channelId || ChannelId.random()
    const deployed = await this.contract
    return deployed.open(_channelId.toString(), receiver, new BigNumber(settlementPeriod), {
      from: sender,
      value: price,
      gas: CREATE_CHANNEL_GAS
    })
  }

  async claim (receiver: string, channelId: string, value: BigNumber, signature: Signature): Promise<TransactionResult> {
    log.info(`Claiming channel with id ${channelId} on behalf of receiver ${receiver}`)
    log.info(`Values: ${value} / Signature: ${signature.toString()}`)
    const deployed = await this.contract
    return deployed.claim(channelId, value, signature.toString(), { from: receiver })
  }

  async deposit (sender: string, channelId: string, value: BigNumber): Promise<TransactionResult> {
    log.info(`Depositing ${value} into channel ${channelId}`)
    const deployed = await this.contract
    return deployed.deposit(channelId, {
      from: sender,
      value: value,
      gas: CREATE_CHANNEL_GAS
    })
  }

  async getState (channelId: string): Promise<number> {
    log.info(`Fetching state for channel ${channelId}`)
    const chan = await this.channelById(channelId)
    if (!chan) return ChannelState.Settled

    const settlingPeriod = chan[3]
    const settlingUntil = chan[4]
    log.info(`Fetched state for channel ${channelId}`)
    if (settlingPeriod.gt(0) && settlingUntil.gt(0)) {
      return ChannelState.Settling
    } else if (settlingPeriod.gt(0) && settlingUntil.eq(0)) {
      return ChannelState.Open
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

  async paymentDigest (channelId: string, value: BigNumber): Promise<string> {
    const deployed = await this.contract
    const digest = abi.soliditySHA3(['address', 'bytes32', 'uint256'],
      [deployed.address, channelId, value.toString()])
    return '0x' + digest.toString('hex')
  }

  async canClaim (channelId: string, payment: BigNumber, receiver: string, signature: Signature): Promise<boolean> {
    const channel = await this.channelById(channelId)
    if (!channel) return false

    const sender = channel[0]

    let digest = await this.paymentDigest(channelId, payment)
    let recovered = sigUtil.recoverPersonalSignature({
      data: digest,
      sig: signature.toString()
    })
    return recovered === sender
  }

  async channelById (channelId: string): Promise<Raw | undefined> {
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
