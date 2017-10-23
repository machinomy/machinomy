import * as util from 'ethereumjs-util'
import Web3 = require('web3')
import BigNumber from 'bignumber.js'
import { PaymentRequired } from './transport'
import { PaymentChannel, PaymentChannelJSON } from './paymentChannel'
import { buildBrokerContract } from 'machinomy-contracts'

export { PaymentChannel, PaymentChannelJSON }

export const ethHash = (message: string): string => {
  const buffer = Buffer.from('\x19Ethereum Signed Message:\n' + message.length + message)
  return '0x' + util.sha3(buffer).toString('hex')
}

const CREATE_CHANNEL_GAS = 300000

export class ChannelContractDefault {
  web3: Web3

  constructor (web3: Web3) {
    this.web3 = web3
  }

  async createChannel (paymentRequired: PaymentRequired, duration: number, settlementPeriod: number, options: any): Promise<any> {
    let deployed = await buildBrokerContract(this.web3).deployed()
    return deployed.createChannel(paymentRequired.receiver, duration, settlementPeriod, options)
  }

  async claim (receiver: string, paymentChannel: PaymentChannel, value: number, v: number, r: string, s: string): Promise<void> {
    let channelId = paymentChannel.channelId
    let deployed = await buildBrokerContract(this.web3).deployed()
    const h = ethHash(channelId.toString() + value.toString())
    let canClaim = await deployed.canClaim(channelId, h, Number(v), r, s)
    if (canClaim) {
      console.log(canClaim)
      return deployed.claim(channelId, value, h, v, r, s, { from: receiver })
    }
  }

  async deposit (sender: string, paymentChannel: PaymentChannel, value: number): Promise<void> {
    let options = {
      from: sender,
      value: value,
      gas: CREATE_CHANNEL_GAS
    }
    const channelId = paymentChannel.channelId
    let deployed = await buildBrokerContract(this.web3).deployed()
    let canDeposit = await deployed.canDeposit(sender, channelId)
    if (canDeposit) {
      return deployed.deposit(channelId, options)
    }
  }

  async canStartSettle (account: string, channelId: string): Promise<boolean> {
    let deployed = await buildBrokerContract(this.web3).deployed()
    return deployed.canStartSettle(account, channelId)
  }

  getState (paymentChannel: PaymentChannel): Promise<number> {
    if (process.env.NODE_ENV === 'test') { // FIXME
      return Promise.resolve(0)
    } else {
      return new Promise((resolve, reject) => {
        buildBrokerContract(this.web3).deployed().then((deployed) => {
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
    let deployed = await buildBrokerContract(this.web3).deployed()
    const channelId = paymentChannel.channelId
    let canStart = await this.canStartSettle(account, channelId)
    if (canStart) {
      let paymentHex = '0x' + payment.toString(16)
      return deployed.startSettle(channelId, paymentHex, { from: account })
    }
  }

  async finishSettle (account: string, paymentChannel: PaymentChannel): Promise<void> {
    const channelId = paymentChannel.channelId
    let deployed = await buildBrokerContract(this.web3).deployed()
    let canFinish = deployed.canFinishSettle(account, channelId)
    if (canFinish) {
      return deployed.finishSettle(channelId, { from: account, gas: 400000 })
    }
  }
}
