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

import { ChannelContractDefault } from './channel_contract_default'
import { ChannelContractToken } from './channel_contract_token'

const log = Log.create('channel')
Log.setProductionMode()

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
      let channelContract
      if (paymentRequired.contractAddress) {
        channelContract = new ChannelContractToken(this.web3)
      } else {
        channelContract = new ChannelContractDefault(this.web3)
      }
      channelContract.createChannel(paymentRequired, duration, settlementPeriod, options).then((channelId: any) => {
        resolve(channelId)
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

  claim (receiver: string, paymentChannel: PaymentChannel, value: number, v: number, r: string, s: string): Promise<any> {
    let channelContract
    if (paymentChannel.contractAddress) {
      channelContract = new ChannelContractToken(this.web3)
    } else {
      channelContract = new ChannelContractDefault(this.web3)
    }
    return channelContract.claim(receiver, paymentChannel, value, v, r, s)
  }

  deposit (sender: string, paymentChannel: PaymentChannel, value: number): Promise<BigNumber.BigNumber> {
    let channelContract
    if (paymentChannel.contractAddress) {
      channelContract = new ChannelContractToken(this.web3)
    } else {
      channelContract = new ChannelContractDefault(this.web3)
    }
    return channelContract.deposit(sender, paymentChannel, value)
  }

  getState (paymentChannel: PaymentChannel): Promise<number> {
    if (process.env.NODE_ENV === 'test') { // FIXME
      return Promise.resolve(0)
    } else {
      let channelContract
      if (paymentChannel.contractAddress) {
        channelContract = new ChannelContractToken(this.web3)
      } else {
        channelContract = new ChannelContractDefault(this.web3)
      }
      return channelContract.getState(paymentChannel)
    }
  }

  startSettle (account: string, paymentChannel: PaymentChannel, payment: BigNumber.BigNumber): Promise<void> {
    let channelContract
    if (paymentChannel.contractAddress) {
      channelContract = new ChannelContractToken(this.web3)
    } else {
      channelContract = new ChannelContractDefault(this.web3)
    }
    return channelContract.startSettle(account, paymentChannel, payment)
  }

  finishSettle (account: string, paymentChannel: PaymentChannel) {
    let channelContract
    if (paymentChannel.contractAddress) {
      channelContract = new ChannelContractToken(this.web3)
    } else {
      channelContract = new ChannelContractDefault(this.web3)
    }
    return channelContract.finishSettle(account, paymentChannel)
  }
}

export class ChannelId {
  id: Buffer

  constructor(buffer: Buffer) {
    this.id = buffer
  }

  toString() {
    return '0x' + this.id.toString('hex')
  }
}

export function id (something: string | Buffer | ChannelId): ChannelId {
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

export function contract(web3: Web3, _address?: string): ChannelContract {
  const address = _address || configuration.contractAddress()
  return new ChannelContract(web3)
}
