import Promise = require('bluebird')
import * as util from 'ethereumjs-util'
import Web3 = require('web3')
import * as BigNumber from 'bignumber.js'
import { PaymentRequired } from './transport'
import { PaymentChannel, PaymentChannelJSON } from './paymentChannel'
import { buildBrokerContract } from 'machinomy-contracts'

export { PaymentChannel, PaymentChannelJSON }

const DAY_IN_SECONDS = 0
// const DAY_IN_SECONDS = 86400

export const ethHash = (message: string): string => {
  const buffer = Buffer.from('\x19Ethereum Signed Message:\n' + message.length + message)
  return '0x' + util.sha3(buffer).toString('hex')
}
/**
 * Default settlement period for a payment channel
 */
const DEFAULT_SETTLEMENT_PERIOD = 2 * DAY_IN_SECONDS

/**
 * Default duration of a payment channel.
 * @type {number}
 */
const DEFAULT_CHANNEL_TTL = 20 * DAY_IN_SECONDS

/**
 * Cost of creating a channel.
 * @type {number}
 */
const CREATE_CHANNEL_GAS = 300000

export class ChannelContractDefault {
  web3: Web3
  // contract: Broker.Contract

  /**
   * @param web3      Instance of Web3.
   * @param address   Address of the deployed contract.
   * @param abi       Interface of the deployed contract.
   */
  constructor (web3: Web3) {
    // this.contract = web3.eth.contract(abi).at(address) as Broker.Contract
    this.web3 = web3
  }

  createChannel (paymentRequired: PaymentRequired, duration: number, settlementPeriod: number, options: any): any {
    return new Promise<PaymentChannel>((resolve, reject) => {
      buildBrokerContract(this.web3).deployed().then((deployed) => {
        deployed.createChannel(paymentRequired.receiver, duration, settlementPeriod, options).then((res: any) => {
          const channelId = res.logs[0].args.channelId
          resolve(channelId)
        })
      }).catch((e: Error) => {
        reject(e)
      })
    })
  }

  /**
   * Initiate payment channel between `sender` and `receiver`, with initial amount set to `value`.
   */
  buildPaymentChannel (sender: string, paymentRequired: PaymentRequired, value: number): Promise<PaymentChannel> {
    const receiver = paymentRequired.receiver
    return new Promise<PaymentChannel>((resolve, reject) => {
      const settlementPeriod = DEFAULT_SETTLEMENT_PERIOD
      const duration = DEFAULT_CHANNEL_TTL
      const options = {
        from: sender,
        value,
        gas: CREATE_CHANNEL_GAS
      }
      this.createChannel(paymentRequired, duration, settlementPeriod, options).then((channelId: string) => {
        const paymentChannel = new PaymentChannel(sender, receiver, channelId, value, 0, undefined, paymentRequired.contractAddress)
        resolve(paymentChannel)
      }).catch((e: Error) => {
        reject(e)
      })
    })
  }

  claim (receiver: string, paymentChannel: PaymentChannel, value: number, v: number, r: string, s: string): Promise<BigNumber.BigNumber> {
    let channelId = paymentChannel.channelId
    return new Promise<BigNumber.BigNumber>((resolve, reject) => {
      return buildBrokerContract(this.web3).deployed().then((deployed) => {
        const h = ethHash(channelId.toString() + value.toString())
        deployed.canClaim(channelId, h, Number(v), r, s).then((canClaim: any) => {
          if (canClaim) {
            deployed.claim(channelId, value, h, v, r, s, { from: receiver }).then((res: any) => {
              resolve()
            })
          }
        })
      })
    })
  }

  deposit (sender: string, paymentChannel: PaymentChannel, value: number): Promise<BigNumber.BigNumber> {
    return new Promise<BigNumber.BigNumber>((resolve, reject) => {
      let options = {
        from: sender,
        value: value,
        gas: CREATE_CHANNEL_GAS
      }
      const channelId = paymentChannel.channelId
      return buildBrokerContract(this.web3).deployed().then((deployed) => {
        deployed.canDeposit(sender, channelId).then((canDeposit: any) => {
          if (canDeposit) {
            deployed.deposit(channelId, options).then((result: any) => {
              resolve(result)
            })
          }
        })
      })
    })
  }

  canStartSettle (account: string, channelId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      return buildBrokerContract(this.web3).deployed().then((deployed) => {
        deployed.canStartSettle(account, channelId).then((result: any) => {
          resolve(result)
        })
      })
    })
  }

  h (channelId: string, payment: BigNumber.BigNumber) {
    const message = channelId.toString() + payment.toString()
    const buffer = Buffer.from('\x19Ethereum Signed Message:\n' + message.length + message)
    return '0x' + util.sha3(buffer).toString('hex')
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

  startSettle (account: string, paymentChannel: PaymentChannel, payment: BigNumber.BigNumber): Promise<void> {
    const channelId = paymentChannel.channelId
    return new Promise((resolve, reject) => {
      let paymentHex = '0x' + payment.toString(16)
      return buildBrokerContract(this.web3).deployed().then((deployed) => {
        this.canStartSettle(account, channelId).then((canStart: boolean) => {
          if (canStart) {
            deployed.startSettle(channelId, paymentHex, { from: account }).then((result: any) => {
              resolve()
            })
          }
        })
      })
    })
  }

  finishSettle (account: string, paymentChannel: PaymentChannel) {
    const channelId = paymentChannel.channelId
    return new Promise((resolve, reject) => {
      return buildBrokerContract(this.web3).deployed().then((deployed) => {
        deployed.canFinishSettle(account, channelId).then((canFinish: boolean) => {
          if (canFinish) {
            deployed.finishSettle(channelId, { from: account, gas: 400000 }).then((result: any) => {
              resolve()
            })
          }
        })
      })
    })
  }
}
