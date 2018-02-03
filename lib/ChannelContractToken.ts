import Web3 = require('web3')
import * as BigNumber from 'bignumber.js'
import { PaymentRequired } from './transport'
import { PaymentChannel } from './paymentChannel'
import { TransactionResult } from 'truffle-contract'
import ChainManager from './chain_manager'

const CREATE_CHANNEL_GAS = 300000

export class ChannelContractToken {
  chainManager: ChainManager

  constructor (chainManager: ChainManager) {
    this.chainManager = chainManager
  }

  async createChannel (paymentRequired: PaymentRequired, duration: number, settlementPeriod: number, options: Web3.TxData): Promise<TransactionResult> {
    const value = new BigNumber.BigNumber(options.value!.toString())
    delete options['value']
    const deployed = await this.chainManager.tokenBroker()
    const deployedERC20 = await this.chainManager.deployedERC20(paymentRequired.contractAddress as string)
    await deployedERC20.approve(deployed.address, value, options)
    return deployed.createChannel(paymentRequired.contractAddress as string, paymentRequired.receiver, duration, settlementPeriod, value, options)
  }

  async claim (receiver: string, paymentChannel: PaymentChannel, value: BigNumber.BigNumber, v: number, r: string, s: string): Promise<TransactionResult> {
    value = new BigNumber.BigNumber(value)
    let channelId = paymentChannel.channelId
    const deployed = await this.chainManager.tokenBroker()
    let canClaim = await deployed.canClaim(channelId, value, Number(v), r, s)
    if (!canClaim) {
      return Promise.reject(new Error('Claim isn\'t possible'))
    }
    return deployed.claim(channelId, value, v, r, s, { from: receiver, gas: CREATE_CHANNEL_GAS })
  }

  async deposit (sender: string, paymentChannel: PaymentChannel, value: BigNumber.BigNumber): Promise<TransactionResult> {
    value = new BigNumber.BigNumber(value)
    let options = {
      from: sender,
      gas: CREATE_CHANNEL_GAS
    }
    const channelId = paymentChannel.channelId
    const deployed = await this.chainManager.tokenBroker()
    let canDeposit = await deployed.canDeposit(sender, channelId)
    if (canDeposit && paymentChannel.contractAddress) {
      const deployedERC20 = await this.chainManager.deployedERC20(paymentChannel.contractAddress)
      await deployedERC20.approve(deployed.address, value, options)
      return deployed.deposit(channelId, value, options)
    } else {
      return Promise.reject(new Error('Claim isn\'t possible'))
    }
  }

  getState (paymentChannel: PaymentChannel): Promise<number> {
    if (process.env.NODE_ENV === 'test') { // FIXME
      return Promise.resolve(0)
    } else {
      return this.chainManager.tokenBroker()
        .then((deployed) => deployed.getState(paymentChannel.channelId))
    }
  }

  async startSettle (account: string, paymentChannel: PaymentChannel, payment: BigNumber.BigNumber): Promise<TransactionResult> {
    const deployed = await this.chainManager.tokenBroker()
    let result = await deployed.canStartSettle(account, paymentChannel.channelId)
    if (!result) {
      return Promise.reject(new Error('Settle start isn\'t possible'))
    }
    return deployed.startSettle(paymentChannel.channelId, payment, { from: paymentChannel.sender })
  }

  async finishSettle (account: string, paymentChannel: PaymentChannel): Promise<TransactionResult> {
    const deployed = await this.chainManager.tokenBroker()
    let result = await deployed.canFinishSettle(account, paymentChannel.channelId)
    if (!result) {
      return Promise.reject(new Error('Settle finish isn\'t possible'))
    }
    return deployed.finishSettle(paymentChannel.channelId, { from: paymentChannel.sender })
  }
}
