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

import { Broker, BrokerToken } from 'machinomy-contracts/types/index'
import { BrokerContract, BrokerTokenContract, buildERC20Contract } from 'machinomy-contracts'

const log = Log.create('channel')

export interface Signature {
  v: number
  r: Buffer
  s: Buffer
}

const DAY_IN_SECONDS = 86400

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

export const ethHash = (message: string): string => {
  const buffer = Buffer.from('\x19Ethereum Signed Message:\n' + message.length + message)
  return '0x' + util.sha3(buffer).toString('hex')
}

export interface PaymentChannelJSON {
  sender: string
  receiver: string
  channelId: string
  value: number
  spent: number
  state: number
  contractAddress: string | undefined
}

/**
 * The Payment Channel
 */
export class PaymentChannel {
  sender: string
  receiver: string
  channelId: string
  value: number
  spent: number
  state: number
  contractAddress: string | undefined

  /**
   * @param sender      Ethereum address of the client.
   * @param receiver    Ethereum address of the server.
   * @param channelId   Identifier of the channel.
   * @param value       Total value of the channel.
   * @param spent       Value sent by {sender} to {receiver}.
   * @param state       0 - 'open', 1 - 'settling', 2 - 'settled'
   */
  constructor (sender: string, receiver: string, channelId: string, value: number, spent: number, state: number = 0, contractAddress: string | undefined) { // FIXME remove contract parameter
    this.sender = sender
    this.receiver = receiver
    this.channelId = channelId
    this.value = value
    this.spent = spent
    this.state = state || 0
    this.contractAddress = contractAddress
  }

  static fromPayment (payment: Payment): PaymentChannel {
    return new PaymentChannel(payment.sender, payment.receiver, payment.channelId, payment.channelValue, payment.value, undefined, payment.contractAddress)
  }

  static fromDocument (document: PaymentChannelJSON): PaymentChannel {
    return new PaymentChannel(
        document.sender,
        document.receiver,
        document.channelId,
        document.value,
        document.spent,
        document.state,
        document.contractAddress
    )
  }

  toJSON (): PaymentChannelJSON {
    return {
      state: this.state,
      spent: this.spent,
      value: this.value,
      channelId: this.channelId,
      receiver: this.receiver,
      sender: this.sender,
      contractAddress: this.contractAddress
    }
  }
}

/**
 * Wrapper for the payment channel contract.
 */
export class ChannelContract {
  web3: Web3
  contract: Broker.Contract

  /**
   * @param web3      Instance of Web3.
   * @param address   Address of the deployed contract.
   * @param abi       Interface of the deployed contract.
   */
  constructor (web3: Web3, address: string, abi: Web3.AbiDefinition[]) {
    this.contract = web3.eth.contract(abi).at(address) as Broker.Contract
    this.web3 = web3
  }

  createChannel (paymentRequired: PaymentRequired, duration: number, settlementPeriod: number, options: any): any {
    return new Promise<PaymentChannel>((resolve, reject) => {
      if (paymentRequired.contractAddress) {
        const value = options['value']
        delete options['value']
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
      } else {
        BrokerContract.deployed().then((deployed: Broker.Contract) => {
          deployed.createChannel(paymentRequired.receiver, duration, settlementPeriod, options).then((res: any) => {
            const channelId = res.logs[0].args.channelId
            resolve(channelId)
          })
        }).catch((e: Error) => {
          reject(e)
        })
      }
    })
  }

  /**
   * Initiate payment channel between `sender` and `receiver`, with initial amount set to `value`.
   */
  buildPaymentChannel (sender: string, paymentRequired: PaymentRequired, value: number): Promise<PaymentChannel> {
    const receiver = paymentRequired.receiver
    return new Promise<PaymentChannel>((resolve, reject) => {
      log.info('Building payment channel from ' + sender + ' to ' + receiver + ', initial amount set to ' + value)
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
    return new Promise<BigNumber.BigNumber>((resolve, reject) => {
      const h = ethHash(channelId.toString() + value.toString())
      this.contract.claim(channelId, value, h, v, r, s, {from: receiver}, () => {
        const didSettle = this.contract.DidSettle({channelId})
        didSettle.watch<Broker.DidSettle>((error, result) => {
          didSettle.stopWatching(() => {
            if (error) {
              reject(error)
            } else {
              log.info('Claimed ' + result.args.payment + ' from ' + result.args.channelId)
              resolve(result.args.payment)
            }
          })
        })
      })
    })
  }

  deposit (sender: string, channelId: string, value: number): Promise<BigNumber.BigNumber> {
    return new Promise<BigNumber.BigNumber>((resolve, reject) => {
      let options = {
        from: sender,
        value: value,
        gas: CREATE_CHANNEL_GAS
      }
      this.contract.deposit(channelId, options, () => {
        const didDeposit = this.contract.DidDeposit({channelId})
        didDeposit.watch<Broker.DidDeposit>((error, result) => {
          didDeposit.stopWatching(() => {
            if (error) {
              reject(error)
            } else {
              log.info(`Deposited ${result.args.value} to ${result.args.channelId}`)
              resolve(result.args.value)
            }
          })
        })
      })
    })
  }

  /**
   * @param {String} account
   * @param {String} channelId
   * @returns Boolean
   */
  canStartSettle (account: string, channelId: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this.contract.canStartSettle(account, channelId, (error, result) => {
        if (error) {
          reject(error)
        } else {
          resolve(result)
        }
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

  canClaim (channelId: string, payment: BigNumber.BigNumber, v: number, r: string, s: string): Promise<boolean> {
    const h = this.h(channelId, payment)
    return new Promise((resolve, reject) => {
      this.contract.canClaim(channelId, h, v, r, s, (error, result) => {
        if (error) {
          reject(error)
        } else {
          resolve(result)
        }
      })
    })
  }

  canFinishSettle (sender: string, channelId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.contract.canFinishSettle(sender, channelId, (error, result) => {
        if (error) {
          reject(error)
        } else {
          resolve(result)
        }
      })
    })
  }

  canDeposit (sender: string, channelId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.contract.canDeposit(sender, channelId, (error, result) => {
        if (error) {
          reject(error)
        } else {
          resolve(result)
        }
      })
    })
  }

  getState (channelId: string): Promise<number> {
    if (process.env.NODE_ENV === 'test') { // FIXME
      return Promise.resolve(0)
    } else {
      return new Promise((resolve, reject) => {
        this.contract.getState(channelId, (error, result) => {
          if (error) {
            reject(error)
          } else {
            resolve(Number(result))
          }
        })
      })
    }
  }

  getUntil (channelId: string): Promise<number> {
    return new Promise((resolve, reject) => {
      this.contract.getUntil(channelId, (error, result) => {
        if (error) {
          reject(error)
        } else {
          resolve(result)
        }
      })
    })
  }

  startSettle (account: string, channelId: string, payment: BigNumber.BigNumber): Promise<void> {
    return new Promise((resolve, reject) => {
      let paymentHex = '0x' + payment.toString(16)
      this.contract.startSettle(channelId, paymentHex, {from: account}, () => {
        log.info('Triggered Start Settle on the contract for channel ' + channelId + ' from ' + account)
        const didStartSettleEvent = this.contract.DidStartSettle({channelId, payment})
        didStartSettleEvent.watch((error) => {
          log.info('Received DidStartSettle event for channel ' + channelId)
          didStartSettleEvent.stopWatching(() => {
            if (error) {
              reject(error)
            } else {
              resolve()
            }
          })
        })
      })
    })
  }

  finishSettle (account: string, channelId: string) {
    return new Promise((resolve, reject) => {
      this.contract.finishSettle(channelId, {from: account, gas: 400000}, () => {
        log.info('Triggered Finish Settle on the contract')
        const didSettle = this.contract.DidSettle({channelId})
        didSettle.watch<Broker.DidSettle>((error, result) => {
          didSettle.stopWatching(() => {
            log.info('Received DidSettle event for channel ' + channelId)
            if (error) {
              reject(error)
            } else {
              resolve(result.args.payment)
            }
          })
        })
      })
    })
  }
}

export class ChannelId {
  id: Buffer

  constructor (buffer: Buffer) {
    this.id = buffer
  }

  toString () {
    return '0x' + this.id.toString('hex')
  }
}

export function id (something: string|Buffer|ChannelId): ChannelId {
  if (typeof something === 'string') {
    const noPrefix = something.replace('0x', '')
    const buffer = Buffer.from(noPrefix, 'HEX')
    return new ChannelId(buffer)
  } else if (something instanceof Buffer) {
    return new ChannelId(something)
  } else if (something instanceof ChannelId) {
    return something
  } else {
    throw new Error(`Can not transform ${something} to ChannelId`)
  }
}

export function contract (web3: Web3, _address?: string): ChannelContract {
  const address = _address || configuration.contractAddress()
  return new ChannelContract(web3, address, configuration.CONTRACT_INTERFACE)
}
