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

export class ChannelContractToken {
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
      const value = options['value']
      delete options['value']
      console.log(options)
      BrokerTokenContract.deployed().then((deployed: BrokerToken.Contract) => {
        let instanceERC20 = buildERC20Contract(paymentRequired.contractAddress)
        instanceERC20.deployed().then((deployedERC20: any) => {
          deployedERC20.approve(deployed.address, value, options).then((res: any) => {
            deployed.createChannel(paymentRequired.contractAddress, paymentRequired.receiver, duration, settlementPeriod, value, options).then((res: any) => {
              const channelId = res.logs[0].args.channelId
              resolve(channelId)
            })
          })
        })
      }).catch((e: Error) => {
        reject(e)
      })
    })
  }

  // claim (receiver: string, channelId: string, value: number, v: number, r: string, s: string): Promise<BigNumber.BigNumber> {
  //   return new Promise<BigNumber.BigNumber>((resolve, reject) => {
  //     const h = ethHash(channelId.toString() + value.toString())
  //     this.contract.claim(channelId, value, h, v, r, s, {from: receiver}, () => {
  //       const didSettle = this.contract.DidSettle({channelId})
  //       didSettle.watch<Broker.DidSettle>((error, result) => {
  //         didSettle.stopWatching(() => {
  //           if (error) {
  //             reject(error)
  //           } else {
  //             log.info('Claimed ' + result.args.payment + ' from ' + result.args.channelId)
  //             resolve(result.args.payment)
  //           }
  //         })
  //       })
  //     })
  //   })
  // }

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

  getState(paymentChannel: PaymentChannel): Promise<number> {
    if (process.env.NODE_ENV === 'test') { // FIXME
      return Promise.resolve(0)
    } else {
      return new Promise((resolve, reject) => {
        BrokerTokenContract.deployed().then((deployed: Broker.Contract) => {
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
    return new Promise((resolve, reject) => {
      BrokerTokenContract.deployed().then((deployed: BrokerToken.Contract) => {
        deployed.canStartSettle(account, paymentChannel.channelId).then((result: any) => {
          if (result) {
            let paymentHex = '0x' + paymentChannel.spent.toString(16)
            deployed.startSettle(paymentChannel.channelId, paymentHex, { from: paymentChannel.sender }).then((res: any) => {
              resolve()
            })
          }
        })
      }).catch((e: Error) => {
        throw e
      })

    })
  }

  finishSettle(account: string, paymentChannel: PaymentChannel) {
    return new Promise((resolve, reject) => {
      BrokerTokenContract.deployed().then((deployed: BrokerToken.Contract) => {
        deployed.canFinishSettle(account, paymentChannel.channelId).then((result: any) => {
          if (result && paymentChannel.contractAddress) {
            deployed.finishSettle(paymentChannel.contractAddress, paymentChannel.channelId, { from: paymentChannel.sender }).then(() => {
              resolve()
            })
          }
        })
      }).catch((e: Error) => {
        throw e
      })
    })
  }
}
