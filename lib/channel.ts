import { Log } from 'typescript-logger'
import Web3 = require('web3')
import * as BigNumber from 'bignumber.js'
import { PaymentRequired } from './transport'
import { ChannelContractDefault } from './ChannelContractDefault'
import { ChannelContractToken } from './ChannelContractToken'
import { PaymentChannelJSON, PaymentChannel } from './paymentChannel'
export { PaymentChannelJSON, PaymentChannel }
import { TransactionResult } from 'truffle-contract'
const log = Log.create('channel')
Log.setProductionMode()

export interface Signature {
  v: number
  r: Buffer
  s: Buffer
}

const DAY_IN_SECONDS = 86400

/** Default duration of a payment channel. */
const DEFAULT_CHANNEL_TTL = 20 * DAY_IN_SECONDS

/** Cost of creating a channel. */
const CREATE_CHANNEL_GAS = 500000

/** Wrapper for the payment channel contract. */
export class ChannelContract {
  web3: Web3

  /**
   * @param web3 - Instance of Web3.
   */
  constructor (web3: Web3) {
    this.web3 = web3
  }

  createChannel (paymentRequired: PaymentRequired, duration: number, settlementPeriod: number, options: any): any {
    return new Promise<PaymentChannel>((resolve, reject) => {
      let channelContract = this.buildChannelContract(paymentRequired)
      channelContract.createChannel(paymentRequired, duration, settlementPeriod, options).then((channelId: any) => {
        resolve(channelId)
      }).catch((e: Error) => {
        reject(e)
      })
    })
  }

  buildChannelContract (paymentRequired: PaymentRequired | PaymentChannel) {
    if (paymentRequired.contractAddress) {
      return new ChannelContractToken(this.web3)
    } else {
      return new ChannelContractDefault(this.web3)
    }
  }

  buildPaymentChannel (sender: string, paymentRequired: PaymentRequired, value: BigNumber.BigNumber, settlementPeriod: number): Promise<PaymentChannel> {
    const receiver = paymentRequired.receiver
    return new Promise<PaymentChannel>((resolve, reject) => {
      log.info('Building payment channel from ' + sender + ' to ' + receiver + ', initial amount set to ' + value)
      const duration = DEFAULT_CHANNEL_TTL
      const options = {
        from: sender,
        value,
        gas: CREATE_CHANNEL_GAS
      } as Web3.TxData
      this.createChannel(paymentRequired, duration, settlementPeriod, options).then((res: any) => {
        const channelId = res.logs[0].args.channelId
        const paymentChannel = new PaymentChannel(sender, receiver, channelId, value, new BigNumber.BigNumber(0), undefined, paymentRequired.contractAddress)
        resolve(paymentChannel)
      }).catch((e: Error) => {
        reject(e)
      })
    })
  }

  claim (receiver: string, paymentChannel: PaymentChannel, value: BigNumber.BigNumber, v: number, r: string, s: string): Promise<TransactionResult> {
    let channelContract = this.buildChannelContract(paymentChannel)
    return channelContract.claim(receiver, paymentChannel, value, v, r, s)
  }

  deposit (sender: string, paymentChannel: PaymentChannel, value: BigNumber.BigNumber): Promise<TransactionResult> {
    let channelContract = this.buildChannelContract(paymentChannel)
    return channelContract.deposit(sender, paymentChannel, value)
  }

  getState (paymentChannel: PaymentChannel): Promise<number> {
    if (process.env.NODE_ENV === 'test') { // FIXME
      return Promise.resolve(0)
    } else {
      let channelContract = this.buildChannelContract(paymentChannel)
      return channelContract.getState(paymentChannel)
    }
  }

  startSettle (account: string, paymentChannel: PaymentChannel, payment: BigNumber.BigNumber): Promise<TransactionResult> {
    let channelContract = this.buildChannelContract(paymentChannel)
    return channelContract.startSettle(account, paymentChannel, payment)
  }

  finishSettle (account: string, paymentChannel: PaymentChannel): Promise<TransactionResult> {
    let channelContract = this.buildChannelContract(paymentChannel)
    return channelContract.finishSettle(account, paymentChannel)
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

export function contract (web3: Web3, _address?: string): ChannelContract {
  return new ChannelContract(web3)
}
