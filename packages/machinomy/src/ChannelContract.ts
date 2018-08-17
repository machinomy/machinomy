import Logger from '@machinomy/logger'
import * as Web3 from 'web3'
import { BigNumber } from 'bignumber.js'
import { TransactionResult } from 'truffle-contract'
import ChannelEthContract from './ChannelEthContract'
import ChannelTokenContract from './ChannelTokenContract'
import Signature from './Signature'
import ChannelId from './ChannelId'
import IChannelsDatabase from './storage/IChannelsDatabase'
import Payment from './payment'

export type Channel = [string, string, BigNumber, BigNumber, BigNumber]
export type ChannelWithTokenContract = [string, string, BigNumber, BigNumber, BigNumber, string]
export type ChannelFromContract = Channel | ChannelWithTokenContract

const LOG = new Logger('ChannelContract')

function isTokenContractDefined (tokenContract: string | undefined): tokenContract is string {
  return tokenContract !== undefined && tokenContract.startsWith('0x') && parseInt(tokenContract, 16) !== 0
}

export default class ChannelContract {
  channelEthContract: ChannelEthContract
  channelTokenContract: ChannelTokenContract
  channelsDao: IChannelsDatabase

  constructor (web3: Web3, channelsDao: IChannelsDatabase, channelEthContract: ChannelEthContract, channelTokenContract: ChannelTokenContract) {
    this.channelEthContract = channelEthContract
    this.channelTokenContract = channelTokenContract
    this.channelsDao = channelsDao
  }

  async open (sender: string, receiver: string, value: BigNumber, settlementPeriod: number | BigNumber, channelId?: ChannelId | string, tokenContract?: string): Promise<TransactionResult> {
    if (isTokenContractDefined(tokenContract)) {
      return this.channelTokenContract.open(sender, receiver, value, settlementPeriod, tokenContract, channelId)
    } else {
      return this.channelEthContract.open(sender, receiver, value, settlementPeriod, channelId)
    }
  }

  async claim (receiver: string, channelId: string, value: BigNumber, signature: Signature): Promise<TransactionResult> {
    const contract = await this.getContractByChannelId(channelId)
    return contract.claim(receiver, channelId, value, signature)
  }

  async deposit (sender: string, channelId: string, value: BigNumber, tokenContract?: string): Promise<TransactionResult> {
    if (isTokenContractDefined(tokenContract)) {
      return this.channelTokenContract.deposit(sender, channelId, value, tokenContract)
    } else {
      return this.channelEthContract.deposit(sender, channelId, value)
    }
  }

  async getState (channelId: string): Promise<number> {
    const contract = await this.getContractByChannelId(channelId)
    return contract.getState(channelId)
  }

  async getSettlementPeriod (channelId: string): Promise<BigNumber> {
    const contract = await this.getContractByChannelId(channelId)
    return contract.getSettlementPeriod(channelId)
  }

  async startSettle (account: string, channelId: string): Promise<TransactionResult> {
    const contract = await this.getContractByChannelId(channelId)
    return contract.startSettle(account, channelId)
  }

  async finishSettle (account: string, channelId: string): Promise<TransactionResult> {
    const contract = await this.getContractByChannelId(channelId)
    return contract.finishSettle(account, channelId)
  }

  async paymentDigest (channelId: string, value: BigNumber): Promise<string> {
    const channel = await this.channelsDao.firstById(channelId)
    if (channel) {
      const tokenContract = channel.tokenContract
      if (isTokenContractDefined(tokenContract)) {
        return this.channelTokenContract.paymentDigest(channelId, value, tokenContract)
      } else {
        return this.channelEthContract.paymentDigest(channelId, value)
      }
    } else {
      throw new Error(`Channel ${channelId} is not found`)
    }

  }

  async canClaim (payment: Payment): Promise<boolean> {
    const channelId: string = payment.channelId
    const price: BigNumber = payment.price
    const receiver: string = payment.receiver
    const signature: Signature = payment.signature
    if (isTokenContractDefined(payment.tokenContract)) {
      return this.channelTokenContract.canClaim(channelId, price, receiver, signature)
    } else {
      return this.channelEthContract.canClaim(channelId, price, receiver, signature)
    }
  }

  async channelById (channelId: string): Promise<ChannelFromContract> {
    const contract = await this.getContractByChannelId(channelId)
    return contract.channelById(channelId)
  }

  async getContractByChannelId (channelId: string): Promise<ChannelEthContract | ChannelTokenContract> {
    const channel = await this.channelsDao.firstById(channelId)
    if (channel) {
      const tokenContract = channel.tokenContract
      return isTokenContractDefined(tokenContract) ? this.channelTokenContract : this.channelEthContract
    } else {
      LOG.info(`getContractByChannelId(): Channel ${channelId} is undefined`)
      return this.channelEthContract
    }
  }
}
