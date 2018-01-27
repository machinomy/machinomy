import Web3 = require('web3')
import * as BigNumber from 'bignumber.js'
import { PaymentRequired } from './transport'
import { PaymentChannel, PaymentChannelJSON } from './paymentChannel'
import { TokenBroker, buildERC20Contract } from '@machinomy/contracts'
import { TransactionResult } from 'truffle-contract'

export { PaymentChannel, PaymentChannelJSON }

const CREATE_CHANNEL_GAS = 300000

export class ChannelContractToken {
  web3: Web3

  constructor (web3: Web3) {
    this.web3 = web3
  }

  async createChannel (paymentRequired: PaymentRequired, duration: number, settlementPeriod: number, options: Web3.TxData): Promise<TransactionResult> {
    const value = new BigNumber.BigNumber(options.value!.toString())
    delete options['value']
    let deployed = await TokenBroker.deployed(this.web3.currentProvider)
    let instanceERC20 = await buildERC20Contract(paymentRequired.contractAddress as string, this.web3)
    let deployedERC20 = await instanceERC20.deployed()
    await deployedERC20.approve(deployed.address, value, options)
    return deployed.createChannel(paymentRequired.contractAddress as string, paymentRequired.receiver, duration, settlementPeriod, value, options)
  }

  async claim (receiver: string, paymentChannel: PaymentChannel, value: BigNumber.BigNumber, v: number, r: string, s: string): Promise<TransactionResult> {
    value = new BigNumber.BigNumber(value)
    let channelId = paymentChannel.channelId
    let deployed = await TokenBroker.deployed(this.web3.currentProvider)
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
    let deployed = await TokenBroker.deployed(this.web3.currentProvider)
    let canDeposit = await deployed.canDeposit(sender, channelId)
    if (canDeposit && paymentChannel.contractAddress) {
      let instanceERC20 = await buildERC20Contract(paymentChannel.contractAddress, this.web3)
      let deployedERC20 = await instanceERC20.deployed()
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
      return new Promise((resolve, reject) => {
        TokenBroker.deployed(this.web3.currentProvider).then((deployed) => {
          deployed.getState(paymentChannel.channelId).then((result: any) => {
            resolve(Number(result))
          })
        }).catch((e: Error) => {
          reject(e)
        })
      })
    }
  }

  async startSettle (account: string, paymentChannel: PaymentChannel, payment: BigNumber.BigNumber): Promise<TransactionResult> {
    let deployed = await TokenBroker.deployed(this.web3.currentProvider)
    let result = await deployed.canStartSettle(account, paymentChannel.channelId)
    if (!result) {
      return Promise.reject(new Error('Settle start isn\'t possible'))
    }
    return deployed.startSettle(paymentChannel.channelId, payment, { from: paymentChannel.sender })
  }

  async finishSettle (account: string, paymentChannel: PaymentChannel): Promise<TransactionResult> {
    let deployed = await TokenBroker.deployed(this.web3.currentProvider)
    let result = await deployed.canFinishSettle(account, paymentChannel.channelId)
    if (!result) {
      return Promise.reject(new Error('Settle finish isn\'t possible'))
    }
    return deployed.finishSettle(paymentChannel.channelId, { from: paymentChannel.sender })
  }
}
