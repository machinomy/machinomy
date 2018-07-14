import * as Web3 from 'web3'
import * as BigNumber from 'bignumber.js'
import { TransactionResult } from 'truffle-contract'
import ChannelEthContract from './ChannelEthContract'
import ChannelTokenContract from './ChannelTokenContract'
import Signature from './Signature'
import ChannelId from './ChannelId'
import IChannelsDatabase from './storage/IChannelsDatabase'

export type Channel = [string, string, BigNumber.BigNumber, BigNumber.BigNumber, BigNumber.BigNumber]
export type ChannelWithTokenContract = [string, string, BigNumber.BigNumber, BigNumber.BigNumber, BigNumber.BigNumber, string]
export type ChannelFromContract = Channel | ChannelWithTokenContract

export default class ChannelContract {
  channelEthContract: ChannelEthContract
  channelTokenContract: ChannelTokenContract
  channelsDao: IChannelsDatabase

  constructor (web3: Web3, channelsDao: IChannelsDatabase, channelEthContract: ChannelEthContract, channelTokenContract: ChannelTokenContract) {
    this.channelEthContract = channelEthContract
    this.channelTokenContract = channelTokenContract
    this.channelsDao = channelsDao
  }

  async open (sender: string, receiver: string, price: BigNumber.BigNumber, settlementPeriod: number | BigNumber.BigNumber, channelId?: ChannelId | string, tokenContract?: string): Promise<TransactionResult> {
    if (this.isTokenContractDefined(tokenContract)) {
      return this.channelTokenContract.open(sender, receiver, price, settlementPeriod, tokenContract!, channelId)
    } else {
      return this.channelEthContract.open(sender, receiver, price, settlementPeriod, channelId)
    }
  }

  async claim (receiver: string, channelId: string, value: BigNumber.BigNumber, signature: Signature): Promise<TransactionResult> {
    const tokenContract = (await this.channelsDao.firstById(channelId))!.contractAddress
    if (this.isTokenContractDefined(tokenContract)) {
      return this.channelTokenContract.claim(receiver, channelId, value, signature)
    } else {
      return this.channelEthContract.claim(receiver, channelId, value, signature)
    }
  }

  async deposit (sender: string, channelId: string, value: BigNumber.BigNumber, tokenContract?: string): Promise<TransactionResult> {
    if (this.isTokenContractDefined(tokenContract)) {
      return this.channelTokenContract.deposit(sender, channelId, value)
    } else {
      return this.channelEthContract.deposit(sender, channelId, value)
    }
  }

  async getState (channelId: string): Promise<number> {
    const tokenContract = (await this.channelsDao.firstById(channelId))!.contractAddress
    if (this.isTokenContractDefined(tokenContract)) {
      return this.channelTokenContract.getState(channelId)
    } else {
      return this.channelEthContract.getState(channelId)
    }
  }

  async getSettlementPeriod (channelId: string): Promise<BigNumber.BigNumber> {
    const tokenContract = (await this.channelsDao.firstById(channelId))!.contractAddress
    if (this.isTokenContractDefined(tokenContract)) {
      return this.channelTokenContract.getSettlementPeriod(channelId)
    } else {
      return this.channelEthContract.getSettlementPeriod(channelId)
    }
  }

  async startSettle (account: string, channelId: string): Promise<TransactionResult> {
    const tokenContract = (await this.channelsDao.firstById(channelId))!.contractAddress
    if (this.isTokenContractDefined(tokenContract)) {
      return this.channelTokenContract.startSettle(account, channelId)
    } else {
      return this.channelEthContract.startSettle(account, channelId)
    }
  }

  async finishSettle (account: string, channelId: string): Promise<TransactionResult> {
    const tokenContract = (await this.channelsDao.firstById(channelId))!.contractAddress
    if (this.isTokenContractDefined(tokenContract)) {
      return this.channelTokenContract.finishSettle(account, channelId)
    } else {
      return this.channelEthContract.finishSettle(account, channelId)
    }
  }

  async paymentDigest (channelId: string, value: BigNumber.BigNumber): Promise<string> {
    const tokenContract = (await this.channelsDao.firstById(channelId))!.contractAddress
    if (this.isTokenContractDefined(tokenContract)) {
      return this.channelTokenContract.paymentDigest(channelId, value, tokenContract)
    } else {
      return this.channelEthContract.paymentDigest(channelId, value)
    }
  }

  async canClaim (channelId: string, payment: BigNumber.BigNumber, receiver: string, signature: Signature) {
    const tokenContract = (await this.channelsDao.firstById(channelId))!.contractAddress
    if (this.isTokenContractDefined(tokenContract)) {
      return this.channelTokenContract.canClaim(channelId, payment, receiver, signature)
    } else {
      return this.channelEthContract.canClaim(channelId, payment, receiver, signature)
    }
  }

  async channelById (channelId: string): Promise<ChannelFromContract> {
    const tokenContract = (await this.channelsDao.firstById(channelId))!.contractAddress
    if (this.isTokenContractDefined(tokenContract)) {
      return this.channelTokenContract.channelById(channelId)
    } else {
      return this.channelEthContract.channelById(channelId)
    }
  }

  setChannelsDAO (channelsDao: IChannelsDatabase) {
    this.channelsDao = channelsDao
  }

  isTokenContractDefined (tokenContract: string | undefined) {
    return tokenContract && tokenContract.startsWith('0x') && parseInt(tokenContract, 16) !== 0
  }
}
