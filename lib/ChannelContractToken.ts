import * as util from 'ethereumjs-util'
import Web3 = require('web3')
import BigNumber from 'bignumber.js'
import { PaymentRequired } from './transport'
import { PaymentChannel, PaymentChannelJSON } from './paymentChannel'
import { buildBrokerTokenContract, buildERC20Contract } from 'machinomy-contracts'

export { PaymentChannel, PaymentChannelJSON }

export const ethHash = (message: string): string => {
  const buffer = Buffer.from('\x19Ethereum Signed Message:\n' + message.length + message)
  return '0x' + util.sha3(buffer).toString('hex')
}

const CREATE_CHANNEL_GAS = 300000

export class ChannelContractToken {
  web3: Web3

  constructor (web3: Web3) {
    this.web3 = web3
  }

  async createChannel (paymentRequired: PaymentRequired, duration: number, settlementPeriod: number, options: any): Promise<any> {
    const value = options['value']
    delete options['value']
    let deployed = await buildBrokerTokenContract(this.web3).deployed()
    let instanceERC20 = await buildERC20Contract(paymentRequired.contractAddress as string, this.web3)
    let deployedERC20 = await instanceERC20.deployed()
    await deployedERC20.approve(deployed.address, value, options)
    return deployed.createChannel(paymentRequired.contractAddress as string, paymentRequired.receiver, duration, settlementPeriod, value, options)
  }

  async claim (receiver: string, paymentChannel: PaymentChannel, value: number, v: number, r: string, s: string): Promise<void> {
    let channelId = paymentChannel.channelId
    let deployed = await buildBrokerTokenContract(this.web3).deployed()
    const h = ethHash(channelId.toString() + value.toString())
    let canClaim = await deployed.canClaim(channelId, h, Number(v), r, s)
    if (canClaim && paymentChannel.contractAddress) {
      return deployed.claim(paymentChannel.contractAddress, channelId, value, h, v, r, s, { from: receiver, gas: CREATE_CHANNEL_GAS })
    }
  }

  async deposit (sender: string, paymentChannel: PaymentChannel, value: number): Promise<void> {
    let options = {
      from: sender,
      gas: CREATE_CHANNEL_GAS
    }
    const channelId = paymentChannel.channelId
    let deployed = await buildBrokerTokenContract(this.web3).deployed()
    let canDeposit = await deployed.canDeposit(sender, channelId)
    if (canDeposit && paymentChannel.contractAddress) {
      let instanceERC20 = await buildERC20Contract(paymentChannel.contractAddress, this.web3)
      let deployedERC20 = await instanceERC20.deployed()
      await deployedERC20.approve(deployed.address, value, options)
      if (paymentChannel.contractAddress) {
        return deployed.deposit(paymentChannel.contractAddress, channelId, value, options)
      }
    }
  }

  /**
   * Overcome Ethereum Signed Message passing to EVM ecrecover.
   * @param channelId
   * @param payment
   * @return {string}
   */
  h (channelId: string, payment: BigNumber) {
    const message = channelId.toString() + payment.toString()
    const buffer = Buffer.from('\x19Ethereum Signed Message:\n' + message.length + message)
    return '0x' + util.sha3(buffer).toString('hex')
  }

  getState (paymentChannel: PaymentChannel): Promise<number> {
    if (process.env.NODE_ENV === 'test') { // FIXME
      return Promise.resolve(0)
    } else {
      return new Promise((resolve, reject) => {
        buildBrokerTokenContract(this.web3).deployed().then((deployed) => {
          deployed.getState(paymentChannel.channelId).then((result: any) => {
            resolve(Number(result))
          })
        }).catch((e: Error) => {
          reject(e)
        })
      })
    }
  }

  async startSettle (account: string, paymentChannel: PaymentChannel, payment: BigNumber): Promise<void> {
    let deployed = await buildBrokerTokenContract(this.web3).deployed()
    let result = await deployed.canStartSettle(account, paymentChannel.channelId)
    if (result) {
      let paymentHex = '0x' + paymentChannel.spent.toString(16)
      return deployed.startSettle(paymentChannel.channelId, paymentHex, { from: paymentChannel.sender })
    } else {
      return Promise.reject(new Error('cant start settle'))
    }
  }

  async finishSettle (account: string, paymentChannel: PaymentChannel): Promise<void> {
    let deployed = await buildBrokerTokenContract(this.web3).deployed()
    let result = await deployed.canFinishSettle(account, paymentChannel.channelId)
    if (result && paymentChannel.contractAddress) {
      return deployed.finishSettle(paymentChannel.contractAddress, paymentChannel.channelId, { from: paymentChannel.sender })
    } else {
      return Promise.reject(new Error('cant finish settle'))
    }
  }
}
