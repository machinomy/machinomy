import * as Web3 from 'web3'
import { BigNumber } from 'bignumber.js'
import { TransactionResult } from 'truffle-contract'
import Logger from '@machinomy/logger'
import ChannelManager from './ChannelManager'
import Signature from './Signature'
import { Unidirectional } from '@machinomy/contracts'
import ChannelId from './ChannelId'

const log = new Logger('channel-eth-contract')

const CREATE_CHANNEL_GAS = 300000

export default class ChannelEthContract {
  contract: Promise<Unidirectional.Contract>

  private web3: Web3

  constructor (web3: Web3) {
    this.web3 = web3
    this.contract = Unidirectional.contract(this.web3.currentProvider).deployed()
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
    const deployed = await this.contract
    const isOpen = await deployed.isOpen(channelId)
    const isSettling = await deployed.isSettling(channelId)

    if (isOpen) {
      return 0
    }

    if (isSettling) {
      return 1
    }

    return 2
  }

  async getSettlementPeriod (channelId: string): Promise<BigNumber> {
    log.info(`Fetching settlement period for channel ${channelId}`)
    const deployed = await this.contract
    const exists = await deployed.isPresent(channelId)

    if (!exists) {
      return new BigNumber(ChannelManager.DEFAULT_SETTLEMENT_PERIOD)
    } else {
      const chan = await deployed.channels(channelId)
      return chan[3]
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
    return deployed.paymentDigest(channelId, value)
  }

  async canClaim (channelId: string, payment: BigNumber, receiver: string, signature: Signature): Promise<boolean> {
    const deployed = await this.contract
    return deployed.canClaim(channelId, payment, receiver, signature.toString())
  }

  async channelById (channelId: string): Promise<[string, string, BigNumber, BigNumber, BigNumber]> {
    const deployed = await this.contract
    return deployed.channels(channelId)
  }
}
