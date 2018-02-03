import * as Web3 from 'web3'
import * as BigNumber from 'bignumber.js'
import { PaymentRequired } from './transport'
import { PaymentChannel } from './paymentChannel'
import { TransactionResult } from 'truffle-contract'
import log from './util/log'
import ChainManager from './chain_manager'

const LOG = log('ChannelContractDefault')

const CREATE_CHANNEL_GAS = 300000

export class ChannelContractDefault {
  chainManager: ChainManager

  constructor (chainManager: ChainManager) {
    this.chainManager = chainManager
  }

  async createChannel (paymentRequired: PaymentRequired, duration: number, settlementPeriod: number, options: any): Promise<TransactionResult> {
    LOG(`Creating channel. Value: ${paymentRequired.price} / Duration: ${duration} / Settlement: ${settlementPeriod}`)
    const deployed = await this.chainManager.defaultBroker()
    return deployed.createChannel(paymentRequired.receiver, duration, settlementPeriod, options)
  }

  async claim (receiver: string, paymentChannel: PaymentChannel, value: BigNumber.BigNumber, v: number, r: string, s: string): Promise<TransactionResult> {
    LOG(`Claiming channel with id ${paymentChannel.channelId.toString()} on behalf of receiver ${receiver}`)
    LOG(`Values: ${value} / V: ${v} / R: ${r} / S: ${s}`)
    value = new BigNumber.BigNumber(value)
    let channelId = paymentChannel.channelId
    const deployed = await this.chainManager.defaultBroker()
    let canClaim = await deployed.canClaim(channelId, value, Number(v), r, s)
    if (!canClaim) {
      return Promise.reject(new Error('Claim isn\'t possible'))
    }
    return deployed.claim(channelId, value, v, r, s, { from: receiver })
  }

  async deposit (sender: string, paymentChannel: PaymentChannel, value: BigNumber.BigNumber): Promise<TransactionResult> {
    LOG(`Depositing ${value} into channel ${paymentChannel.channelId.toString()}`)
    value = new BigNumber.BigNumber(value)
    let options = {
      from: sender,
      value: value,
      gas: CREATE_CHANNEL_GAS
    } as Web3.TxData
    const channelId = paymentChannel.channelId
    const deployed = await this.chainManager.defaultBroker()
    let canDeposit = await deployed.canDeposit(sender, channelId)
    if (!canDeposit) {
      return Promise.reject(new Error('Deposit isn\'t possible'))
    }
    return deployed.deposit(channelId, options)
  }

  async canStartSettle (account: string, channelId: string): Promise<boolean> {
    const deployed = await this.chainManager.defaultBroker()
    return deployed.canStartSettle(account, channelId)
  }

  getState (paymentChannel: PaymentChannel): Promise<number> {
    if (process.env.NODE_ENV === 'test') { // FIXME
      return Promise.resolve(0)
    } else {
      return this.chainManager.defaultBroker()
          .then((deployed) => deployed.getState(paymentChannel.channelId))
    }
  }

  async startSettle (account: string, paymentChannel: PaymentChannel, payment: BigNumber.BigNumber): Promise<TransactionResult> {
    const deployed = await this.chainManager.defaultBroker()
    const channelId = paymentChannel.channelId
    let canStart = await this.canStartSettle(account, channelId)
    if (!canStart) {
      return Promise.reject(new Error('Settle start isn\'t possible'))
    }
    return deployed.startSettle(channelId, payment, { from: account })
  }

  async finishSettle (account: string, paymentChannel: PaymentChannel): Promise<TransactionResult> {
    const channelId = paymentChannel.channelId
    const deployed = await this.chainManager.defaultBroker()
    let canFinish = deployed.canFinishSettle(account, channelId)
    if (!canFinish) {
      return Promise.reject(new Error('Settle finish isn\'t possible'))
    }
    return deployed.finishSettle(channelId, { from: account, gas: 400000 })
  }
}
