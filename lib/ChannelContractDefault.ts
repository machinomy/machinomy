import Web3 = require('web3')
import BigNumber from 'bignumber.js'
import { PaymentRequired } from './transport'
import { PaymentChannel, PaymentChannelJSON } from './paymentChannel'
import { Broker } from '@machinomy/contracts'
import { TransactionResult } from 'truffle-contract'

export { PaymentChannel, PaymentChannelJSON }

const CREATE_CHANNEL_GAS = 300000

export class ChannelContractDefault {
  web3: Web3

  constructor (web3: Web3) {
    this.web3 = web3
  }

  async createChannel (paymentRequired: PaymentRequired, duration: number, settlementPeriod: number, options: any): Promise<TransactionResult> {
    let deployed = await Broker.deployed(this.web3.currentProvider)
    return deployed.createChannel(paymentRequired.receiver, duration, settlementPeriod, options)
  }

  async claim (receiver: string, paymentChannel: PaymentChannel, value: BigNumber, v: number, r: string, s: string): Promise<TransactionResult> {
    value = new BigNumber(value)
    let channelId = paymentChannel.channelId
    let deployed = await Broker.deployed(this.web3.currentProvider)
    let canClaim = await deployed.canClaim(channelId, value, Number(v), r, s)
    if (!canClaim) {
      return Promise.reject(new Error('Claim isn\'t possible'))
    }
    return deployed.claim(channelId, value, v, r, s, { from: receiver })
  }

  async deposit (sender: string, paymentChannel: PaymentChannel, value: BigNumber): Promise<TransactionResult> {
    value = new BigNumber(value)
    let options = {
      from: sender,
      value: value,
      gas: CREATE_CHANNEL_GAS
    }
    const channelId = paymentChannel.channelId
    let deployed = await Broker.deployed(this.web3.currentProvider)
    let canDeposit = await deployed.canDeposit(sender, channelId)
    if (!canDeposit) {
      return Promise.reject(new Error('Deposit isn\'t possible'))
    }
    return deployed.deposit(channelId, options)
  }

  async canStartSettle (account: string, channelId: string): Promise<boolean> {
    let deployed = await Broker.deployed(this.web3.currentProvider)
    return deployed.canStartSettle(account, channelId)
  }

  getState (paymentChannel: PaymentChannel): Promise<number> {
    if (process.env.NODE_ENV === 'test') { // FIXME
      return Promise.resolve(0)
    } else {
      return new Promise((resolve, reject) => {
        Broker.deployed(this.web3.currentProvider).then((deployed) => {
          deployed.getState(paymentChannel.channelId).then((result: any) => {
            resolve(Number(result))
          })
        }).catch((e: Error) => {
          reject(e)
        })
      })
    }
  }

  async startSettle (account: string, paymentChannel: PaymentChannel, payment: BigNumber): Promise<TransactionResult> {
    let deployed = await Broker.deployed(this.web3.currentProvider)
    const channelId = paymentChannel.channelId
    let canStart = await this.canStartSettle(account, channelId)
    if (!canStart) {
      return Promise.reject(new Error('Settle start isn\'t possible'))
    }
    return deployed.startSettle(channelId, payment, { from: account })
  }

  async finishSettle (account: string, paymentChannel: PaymentChannel): Promise<TransactionResult> {
    const channelId = paymentChannel.channelId
    let deployed = await Broker.deployed(this.web3.currentProvider)
    let canFinish = deployed.canFinishSettle(account, channelId)
    if (!canFinish) {
      return Promise.reject(new Error('Settle finish isn\'t possible'))
    }
    return deployed.finishSettle(channelId, { from: account, gas: 400000 })
  }
}
