import Promise = require('bluebird')
import * as util from 'ethereumjs-util'
import { Log } from 'typescript-logger'
import * as configuration from './configuration'
import { FilterResult } from 'web3'
import Web3 = require('web3')
import * as BigNumber from 'bignumber.js'
import Payment from './Payment'
import { sender } from './configuration'
import { PaymentRequired } from './transport'
import { PaymentChannel, PaymentChannelJSON } from './payment_channel'
import { Broker, BrokerToken } from 'machinomy-contracts/types/index'
import { BrokerContract, BrokerTokenContract, buildERC20Contract } from 'machinomy-contracts'

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
  contract: Broker.Contract

  /**
   * @param web3      Instance of Web3.
   * @param address   Address of the deployed contract.
   * @param abi       Interface of the deployed contract.
   */
  constructor() {
    // this.contract = web3.eth.contract(abi).at(address) as Broker.Contract
    // this.web3 = web3
  }

  createChannel(paymentRequired: PaymentRequired, duration: number, settlementPeriod: number, options: any): any {
    return new Promise<PaymentChannel>((resolve, reject) => {
      BrokerContract.deployed().then((deployed: Broker.Contract) => {
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

  claim (receiver: string, channelId: string, value: number, v: number, r: string, s: string): Promise<BigNumber.BigNumber> {
    return BrokerContract.deployed().then((deployed: Broker.Contract) => {
      return new Promise<BigNumber.BigNumber>((resolve, reject) => {
        const h = ethHash(channelId.toString() + value.toString())
        this.contract.claim(channelId, value, h, v, r, s, { from: receiver }).then((res: any) => {
          let big = new BigNumber(1)
          resolve(big)
        })
      })
    })
  }

  // deposit (sender: string, channelId: string, value: number): Promise<BigNumber.BigNumber> {
  //   return new Promise<BigNumber.BigNumber>((resolve, reject) => {
  //     let options = {
  //       from: sender,
  //       value: value,
  //       gas: CREATE_CHANNEL_GAS
  //     }
  //     this.contract.deposit(channelId, options, () => {
  //       const didDeposit = this.contract.DidDeposit({channelId})
  //       didDeposit.watch<Broker.DidDeposit>((error, result) => {
  //         didDeposit.stopWatching(() => {
  //           if (error) {
  //             reject(error)
  //           } else {
  //             log.info(`Deposited ${result.args.value} to ${result.args.channelId}`)
  //             resolve(result.args.value)
  //           }
  //         })
  //       })
  //     })
  //   })
  // }

  /**
   * @param {String} account
   * @param {String} channelId
   * @returns Boolean
   */
    //  this.contract.canStartSettle(account, channelId, (error, result) => {
  canStartSettle (account: string, channelId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      return BrokerContract.deployed().then((deployed: Broker.Contract) => {
        deployed.canStartSettle(account, channelId).then((result: any) => {
          resolve(result)
        })
      })
    })
  }

  /**
   * Overcome Ethereum Signed Message passing to EVM ecrecover.
   * @param channelId
   * @param payment
   * @return {string}
   */
  h(channelId: string, payment: BigNumber.BigNumber) {
    const message = channelId.toString() + payment.toString()
    const buffer = Buffer.from('\x19Ethereum Signed Message:\n' + message.length + message)
    return '0x' + util.sha3(buffer).toString('hex')
  }

  canFinishSettle (sender: string, channelId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      return BrokerContract.deployed().then((deployed: Broker.Contract) => {
        this.contract.canFinishSettle(sender, channelId).then((result: any) => {
          resolve(result)
        })
      })
    })
  }


  getState(paymentChannel: PaymentChannel): Promise<number> {
    if (process.env.NODE_ENV === 'test') { // FIXME
      return Promise.resolve(0)
    } else {
      return new Promise((resolve, reject) => {
        BrokerContract.deployed().then((deployed: Broker.Contract) => {
          deployed.getState(paymentChannel.channelId).then((result: any) => {
            resolve(Number(result))
          })
        }).catch((e: Error) => {
          reject(e)
        })
      })
    }
  }

  startSettle(account: string, paymentChannel: PaymentChannel, payment: BigNumber.BigNumber): Promise<void> {
    const channelId = paymentChannel.channelId
    return new Promise((resolve, reject) => {
      let paymentHex = '0x' + payment.toString(16)
      return BrokerContract.deployed().then((deployed: Broker.Contract) => {
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

  finishSettle(account: string, paymentChannel: PaymentChannel) {
    const channelId = paymentChannel.channelId
    return new Promise((resolve, reject) => {
      return BrokerContract.deployed().then((deployed: Broker.Contract) => {
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
