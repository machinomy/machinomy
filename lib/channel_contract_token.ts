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
import { buildBrokerTokenContract, buildERC20Contract } from 'machinomy-contracts'

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
      const value = options['value']
      delete options['value']
      buildBrokerTokenContract(this.web3).deployed().then((deployed) => {
        buildERC20Contract(paymentRequired.contractAddress as string, this.web3).then((instanceERC20) => {
          instanceERC20.deployed().then((deployedERC20: any) => {
            deployedERC20.approve(deployed.address, value, options).then((res: any) => {
              deployed.createChannel(paymentRequired.contractAddress as string, paymentRequired.receiver, duration, settlementPeriod, value, options).then((res: any) => {
                const channelId = res.logs[0].args.channelId
                resolve(channelId)
              })
            })
          })
        })
      }).catch((e: Error) => {
        reject(e)
      })
    })
  }

  claim (receiver: string, paymentChannel: PaymentChannel, value: number, v: number, r: string, s: string): Promise<BigNumber.BigNumber> {
    let channelId = paymentChannel.channelId
    return new Promise<BigNumber.BigNumber>((resolve, reject) => {
      return buildBrokerTokenContract(this.web3).deployed().then((deployed) => {
        const h = ethHash(channelId.toString() + value.toString())
        deployed.canClaim(channelId, h, Number(v), r, s).then((canClaim: any) => {
          if (canClaim && paymentChannel.contractAddress) {
            deployed.claim(paymentChannel.contractAddress, channelId, value, h, v, r, s, { from: receiver, gas: CREATE_CHANNEL_GAS }).then((res: any) => {
              console.log(res)
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
        gas: CREATE_CHANNEL_GAS
      }
      const channelId = paymentChannel.channelId
      buildBrokerTokenContract(this.web3).deployed().then((deployed) => {
        deployed.canDeposit(sender, channelId).then((canDeposit: any) => {
          if (canDeposit && paymentChannel.contractAddress) {
            buildERC20Contract(paymentChannel.contractAddress, this.web3).then((instanceERC20) => {
              instanceERC20.deployed().then((deployedERC20: any) => {
                deployedERC20.approve(deployed.address, value, options).then((res: any) => {
                  if (paymentChannel.contractAddress) {
                    deployed.deposit(paymentChannel.contractAddress, channelId, value, options).then((result: any) => {
                      resolve(result)
                    })
                  }
                })
              })
            })
          }
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

  startSettle (account: string, paymentChannel: PaymentChannel, payment: BigNumber.BigNumber): Promise<void> {
    return new Promise((resolve, reject) => {
      buildBrokerTokenContract(this.web3).deployed().then((deployed) => {
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

  finishSettle (account: string, paymentChannel: PaymentChannel) {
    return new Promise((resolve, reject) => {
      buildBrokerTokenContract(this.web3).deployed().then((deployed) => {
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
