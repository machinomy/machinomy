import * as Web3 from 'web3'
import * as BigNumber from 'bignumber.js'
import { TransactionResult } from 'truffle-contract'
import log from './util/log'
import Signature from './Signature'
import { Unidirectional } from '@machinomy/contracts'
import ChannelId from './ChannelId'

const LOG = log('ChannelContract')

const CREATE_CHANNEL_GAS = 300000

export default class ChannelContract {
  private _contract?: Unidirectional.Contract

  private web3: Web3

  constructor (web3: Web3) {
    this.web3 = web3
  }

  async open (sender: string, receiver: string, price: BigNumber.BigNumber, settlementPeriod: number | BigNumber.BigNumber, channelId?: ChannelId | string): Promise<TransactionResult> {
    LOG(`Creating channel. Value: ${price} / Settlement: ${settlementPeriod}`)
    let _channelId = channelId || ChannelId.random()
    const deployed = await this.contract()
    return deployed.open(_channelId.toString(), receiver, new BigNumber.BigNumber(settlementPeriod), {
      from: sender,
      value: price,
      gas: CREATE_CHANNEL_GAS
    })
  }

  async claim (receiver: string, channelId: string, value: BigNumber.BigNumber, signature: Signature): Promise<TransactionResult> {
    LOG(`Claiming channel with id ${channelId} on behalf of receiver ${receiver}`)
    LOG(`Values: ${value} / Signature: ${signature.toString()}`)
    const deployed = await this.contract()
    return deployed.claim(channelId, value, signature.toString(), { from: receiver })
  }

  async deposit (sender: string, channelId: string, value: BigNumber.BigNumber): Promise<TransactionResult> {
    LOG(`Depositing ${value} into channel ${channelId}`)
    const deployed = await this.contract()
    return deployed.deposit(channelId, {
      from: sender,
      value: value,
      gas: CREATE_CHANNEL_GAS
    })
  }

  async getState (channelId: string): Promise<number> {
    LOG(`Fetching state for channel ${channelId}`)
    const deployed = await this.contract()
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

  async getSettlementPeriod (channelId: string): Promise<BigNumber.BigNumber> {
    LOG(`Fetching settlement period for channel ${channelId}`)
    const deployed = await this.contract()
    const exists = await deployed.isPresent(channelId)

    if (!exists) {
      throw new Error(`Cannot fetch settlement period for non-existent channel ${channelId}.`)
    }

    const chan = await deployed.channels(channelId)
    return chan[3]
  }

  async startSettle (account: string, channelId: string): Promise<TransactionResult> {
    LOG(`Starting settle for account ${account} and channel id ${channelId}.`)
    const deployed = await this.contract()
    return deployed.startSettling(channelId, { from: account })
  }

  async finishSettle (account: string, channelId: string): Promise<TransactionResult> {
    LOG(`Finishing settle for account ${account} and channel ID ${channelId}.`)
    const deployed = await this.contract()
    return deployed.settle(channelId, { from: account, gas: 400000 })
  }

  async paymentDigest (channelId: string, value: BigNumber.BigNumber): Promise<string> {
    const deployed = await this.contract()
    return deployed.paymentDigest(channelId, value)
  }

  async canClaim (channelId: string, payment: BigNumber.BigNumber, receiver: string, signature: Signature) {
    const deployed = await this.contract()
    return deployed.canClaim(channelId, payment, receiver, signature.toString())
  }

  async channelById (channelId: string): Promise<[string, string, BigNumber.BigNumber, BigNumber.BigNumber, BigNumber.BigNumber]> {
    const deployed = await this.contract()
    return deployed.channels(channelId)
  }

  private async contract (): Promise<Unidirectional.Contract> {
    if (!this._contract) {
      this._contract = process.env.CONTRACT_ADDRESS ?
        await Unidirectional.contract(this.web3.currentProvider).at(process.env.CONTRACT_ADDRESS) :
        await Unidirectional.contract(this.web3.currentProvider).deployed()
    }

    return this._contract
  }
}
