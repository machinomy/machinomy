import Promise = require('bluebird')
import * as util from 'ethereumjs-util'
import { Log } from 'ng2-logger'
import * as configuration from './configuration'
import { FilterResult } from 'web3'
import Web3 = require('web3')
import * as BigNumber from 'bignumber.js'

const log = Log.create('channel')

export interface Signature {
  v: number
  r: Buffer
  s: Buffer
}

namespace Broker {
  export interface Contract {
    createChannel (receiver: string, duration: number, settlementPeriod: number, options: any, callback: () => void): void
    startSettle (channelId: string, payment: BigNumber.BigNumber, options: any, callback: () => void): void
    claim (channelId: string, value: number, h: string, v: number, r: string, s: string, options: any, callback: () => void): void
    finishSettle (channelId: string, options: any, callback: () => void): void

    canClaim (channelId: string, h: string, v: number, r: string, s: string): boolean
    canStartSettle (account: string, channelId: string, callback: (error: any|null, result?: boolean) => void): void
    canFinishSettle (sender: string, channelId: string): boolean

    getState (channelId: string, callback: (error: any|null, state?: number) => void): void
    getUntil (channelId: string, callback: (error: any|null, until?: number) => void): void

    DidSettle (query: {channelId: string}): FilterResult
    DidStartSettle (query: {channelId: string, payment: BigNumber.BigNumber}): FilterResult
    DidCreateChannel (query: {sender: string, receiver: string}): FilterResult
  }

  export interface DidSettle {
    payment: BigNumber.BigNumber
    channelId: string
    oddValue: BigNumber.BigNumber
  }

  // event DidStartSettle(bytes32 indexed channelId, uint256 payment);
  export interface DidStartSettle {
    channelId: string
    payment: BigNumber.BigNumber
  }

  export interface DidCreateChannel {
    sender: string
    receiver: string
    channelId: string
  }
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

const ethHash = (message: string): string => {
  const buffer = Buffer.from('\x19Ethereum Signed Message:\n' + message.length + message)
  return '0x' + util.sha3(buffer).toString('hex')
}

interface PaymentChannelJSON {
  sender: string
  receiver: string
  channelId: string
  value: number
  spent: number
  state: number
}

/**
 * The Payment Channel
 */
class PaymentChannel {
  sender: string
  receiver: string
  channelId: string
  value: number
  spent: number
  state: number

  /**
   * @param sender      Ethereum address of the client.
   * @param receiver    Ethereum address of the server.
   * @param channelId   Identifier of the channel.
   * @param value       Total value of the channel.
   * @param spent       Value sent by {sender} to {receiver}.
   * @param state       0 - 'open', 1 - 'settling', 2 - 'settled'
   */
  constructor (sender: string, receiver: string, channelId: string, value: number, spent: number, state: number = 0) { // FIXME remove contract parameter
    this.sender = sender
    this.receiver = receiver
    this.channelId = channelId
    this.value = value
    this.spent = spent
    this.state = state || 0
  }

  static fromPayment (payment: Payment): PaymentChannel {
    return new PaymentChannel(payment.sender, payment.receiver, payment.channelId, payment.channelValue, payment.value)
  }

  static fromDocument (document: PaymentChannelJSON): PaymentChannel {
    return new PaymentChannel(
        document.sender,
        document.receiver,
        document.channelId,
        document.value,
        document.spent,
        document.state
    )
  }

  /**
   * Sign value transfer.
   */
  sign (web3: Web3, value: number): Promise<Signature> {
    const message = this.channelId + value.toString()
    const messageHex = '0x' + Buffer.from(message).toString('hex')

    let isOnNodeJs = false
    /*
    if (typeof BROWSER === 'undefined') {
      isOnNodeJs = true
    }
    */

    if (isOnNodeJs) {
      return new Promise((resolve, reject) => {
        web3.eth.sign(this.sender, messageHex, (error, signature) => {
          if (error) {
            reject(error)
          } else {
            resolve(util.fromRpcSig(signature))
          }
        })
      })
    } else {
      return new Promise((resolve, reject) => {
        const message = Buffer.from(messageHex.replace('0x', ''), 'hex').toString()
        const sha3 = ethHash(message)
        web3.eth.sign(this.sender, sha3, (error, signature) => {
          if (error) {
            reject(error)
          } else {
            resolve(util.fromRpcSig(signature))
          }
        })
      })
    }
  }
}

/**
 * Wrapper for the payment channel contract.
 */
class ChannelContract {
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

  /**
   * Initiate payment channel between `sender` and `receiver`, with initial amount set to `value`.
   */
  buildPaymentChannel (sender: string, receiver: string, value: number): Promise<PaymentChannel> {
    return new Promise<PaymentChannel>((resolve, reject) => {
      log.info('Building payment channel from ' + sender + ' to ' + receiver + ', initial amount set to ' + value)
      const settlementPeriod = DEFAULT_SETTLEMENT_PERIOD
      const duration = DEFAULT_CHANNEL_TTL
      const options = {
        from: sender,
        value,
        gas: CREATE_CHANNEL_GAS
      }
      this.contract.createChannel(receiver, duration, settlementPeriod, options, () => {
        const didCreateChannelEvent = this.contract.DidCreateChannel({sender, receiver})
        log.info('Waiting for the channel to be created on the blockchain: watching for DidCreateChannel event')
        didCreateChannelEvent.watch<Broker.DidCreateChannel>((error, result) => {
          if (error) {
            reject(error)
          } else {
            const channelId = result.args.channelId
            log.info('The channel ' + channelId + ' is created')
            const paymentChannel = new PaymentChannel(sender, receiver, channelId, value, 0)
            didCreateChannelEvent.stopWatching(() => {
              log.info('No longer watching for DidCreateChannel event')
              if (error) {
                reject(error)
              } else {
                resolve(paymentChannel)
              }
            })
          }
        })
      })
    })
  }

  claim (receiver: string, channelId: string, value: number, v: number, r: string, s: string): Promise<BigNumber.BigNumber> {
    return new Promise((resolve, reject) => {
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

  /**
   * @param {String} account
   * @param {String} channelId
   * @returns Boolean
   */
  canStartSettle (account: string, channelId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
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

  canClaim (channelId: string, payment: BigNumber.BigNumber, v: number, r: string, s: string): boolean {
    const h = this.h(channelId, payment)
    return this.contract.canClaim(channelId, h, v, r, s)
  }

  canFinishSettle (sender: string, channelId: string): boolean {
    return this.contract.canFinishSettle(sender, channelId)
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
      this.contract.startSettle(channelId, payment, {from: account}, () => {
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
      this.contract.finishSettle(channelId, {from: account}, () => {
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

interface PaymentJSON {
  channelId: string
  sender: string
  receiver: string
  price: number
  value: number
  channelValue: number
  v: number|string
  r: string
  s: string
}

class Payment {
  channelId: string
  sender: string
  receiver: string
  price: number
  value: number
  channelValue: number
  v: number
  r: string
  s: string

  constructor (options: PaymentJSON) {
    this.channelId = options.channelId
    this.sender = options.sender
    this.receiver = options.receiver
    this.price = options.price
    this.value = options.value
    this.channelValue = options.channelValue
    this.v = Number(options.v)
    this.r = options.r
    this.s = options.s
  }

  /**
   * Build {Payment} based on PaymentChannel and monetary value to send.
   */
  static fromPaymentChannel (web3: Web3, paymentChannel: PaymentChannel, price: number): Promise<Payment> {
    const value = price + paymentChannel.spent
    return paymentChannel.sign(web3, value).then((signature) => {
      return new Payment({
        channelId: paymentChannel.channelId,
        sender: paymentChannel.sender,
        receiver: paymentChannel.receiver,
        price,
        value,
        channelValue: paymentChannel.value,
        v: signature.v,
        r: '0x' + signature.r.toString('hex'),
        s: '0x' + signature.s.toString('hex')
      })
    })
  }
}

class ChannelId {
  id: Buffer

  constructor (buffer: Buffer) {
    this.id = buffer
  }

  toString () {
    return '0x' + this.id.toString('hex')
  }
}

const id = (something: string|Buffer|ChannelId): ChannelId => {
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

/**
 * @param {Web3} web3
 * @return {ChannelContract}
 */
const contract = (web3: Web3): ChannelContract => {
  const address = configuration.contractAddress()
  return new ChannelContract(web3, address, configuration.CONTRACT_INTERFACE)
}

module.exports = {
  contract,
  Payment,
  PaymentChannel,
  ChannelId,
  id
}
