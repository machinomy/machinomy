import * as BigNumber from 'bignumber.js'
import { PaymentChannel } from './payment_channel'
import ChannelsDatabase from './storages/channels_database'
import ChannelId from './ChannelId'
import { EventEmitter } from 'events'
import Mutex from './util/mutex'
import { TransactionResult } from 'truffle-contract'
import PaymentsDatabase from './storages/payments_database'
import Payment from './payment'
import TokensDatabase from './storages/tokens_database'
import log from './util/log'
import ChannelContract from './channel_contract'
import PaymentManager from './payment_manager'
import { MachinomyOptions } from '../MachinomyOptions'
import * as Web3 from 'web3'

const LOG = log('ChannelManager')

const DAY_IN_SECONDS = 86400

/** Default settlement period for a payment channel */
export const DEFAULT_SETTLEMENT_PERIOD = 2 * DAY_IN_SECONDS

export interface ChannelManager extends EventEmitter {
  openChannel (sender: string, receiver: string, amount: BigNumber.BigNumber, minDepositAmount?: BigNumber.BigNumber, channelId?: ChannelId | string): Promise<PaymentChannel>

  closeChannel (channelId: string | ChannelId): Promise<TransactionResult>

  deposit (channelId: string, value: BigNumber.BigNumber): Promise<TransactionResult>

  nextPayment (channelId: string | ChannelId, amount: BigNumber.BigNumber, meta: string): Promise<Payment>

  acceptPayment (payment: Payment): Promise<string>

  requireOpenChannel (sender: string, receiver: string, amount: BigNumber.BigNumber, minDepositAmount?: BigNumber.BigNumber): Promise<PaymentChannel>

  channels (): Promise<PaymentChannel[]>

  openChannels (): Promise<PaymentChannel[]>

  settlingChannels (): Promise<PaymentChannel[]>

  channelById (channelId: ChannelId | string): Promise<PaymentChannel | null>

  verifyToken (token: string): Promise<boolean>
}

export default ChannelManager

export class ChannelManagerImpl extends EventEmitter implements ChannelManager {
  private account: string

  private web3: Web3

  private channelsDao: ChannelsDatabase

  private paymentsDao: PaymentsDatabase

  private tokensDao: TokensDatabase

  private channelContract: ChannelContract

  private paymentManager: PaymentManager

  private mutex: Mutex = new Mutex()

  private machinomyOptions: MachinomyOptions

  constructor (account: string, web3: Web3, channelsDao: ChannelsDatabase, paymentsDao: PaymentsDatabase, tokensDao: TokensDatabase, channelContract: ChannelContract, paymentManager: PaymentManager, machinomyOptions: MachinomyOptions) {
    super()
    this.account = account
    this.web3 = web3
    this.channelsDao = channelsDao
    this.paymentsDao = paymentsDao
    this.tokensDao = tokensDao
    this.channelContract = channelContract
    this.paymentManager = paymentManager
    this.machinomyOptions = machinomyOptions
  }

  openChannel (sender: string, receiver: string, amount: BigNumber.BigNumber, minDepositAmount?: BigNumber.BigNumber, channelId?: ChannelId | string): Promise<PaymentChannel> {
    return this.mutex.synchronize(() => this.internalOpenChannel(sender, receiver, amount, minDepositAmount, channelId))
  }

  closeChannel (channelId: string | ChannelId): Promise<TransactionResult> {
    return this.mutex.synchronize(() => this.internalCloseChannel(channelId))
  }

  deposit (channelId: string, value: BigNumber.BigNumber): Promise<TransactionResult> {
    return this.mutex.synchronize(async () => {
      const channel = await this.channelById(channelId)

      if (!channel) {
        throw new Error('No payment channel found.')
      }

      const res = await this.channelContract.deposit(this.account, channelId, value)
      await this.channelsDao.deposit(channelId, value)
      return res
    })
  }

  nextPayment (channelId: string | ChannelId, amount: BigNumber.BigNumber, meta: string): Promise<Payment> {
    return this.mutex.synchronize(async () => {
      const channel = await this.channelById(channelId)

      if (!channel) {
        throw new Error(`Channel with id ${channelId.toString()} not found.`)
      }

      const toSpend = channel.spent.add(amount)

      if (toSpend.greaterThan(channel.value)) {
        throw new Error(`Total spend ${toSpend.toString()} is larger than channel value ${channel.value.toString()}`)
      }

      const payment = await this.paymentManager.buildPaymentForChannel(channel, amount, toSpend, meta)
      const chan = PaymentChannel.fromPayment(payment)
      await this.channelsDao.saveOrUpdate(chan)
      return payment
    })
  }

  acceptPayment (payment: Payment): Promise<string> {
    LOG(`Queueing payment of ${payment.price.toString()} Wei to channel with ID ${payment.channelId}.`)

    return this.mutex.synchronize(async () => {
      const channel = await this.findChannel(payment)

      LOG(`Adding ${payment.price.toString()} Wei to channel with ID ${channel.channelId.toString()}.`)

      const valid = await this.paymentManager.isValid(payment, channel)

      if (!valid) {
        LOG(`Received invalid payment from ${payment.sender}!`)
        const existingChannel = await this.channelsDao.findBySenderReceiverChannelId(payment.sender, payment.receiver, payment.channelId)

        if (existingChannel) {
          LOG(`Found existing channel with id ${payment.channelId} between ${payment.sender} and ${payment.receiver}.`)
          LOG('Closing channel due to malfeasance.')
          await this.internalCloseChannel(channel.channelId)
        }

        throw new Error('Invalid payment.')
      }

      channel.spent = payment.value
      const token = this.web3.sha3(JSON.stringify(payment)).toString()
      await this.channelsDao.saveOrUpdate(channel)
      await this.tokensDao.save(token, payment.channelId)
      await this.paymentsDao.save(token, payment)
      return token
    })
  }

  requireOpenChannel (sender: string, receiver: string, amount: BigNumber.BigNumber, minDepositAmount?: BigNumber.BigNumber): Promise<PaymentChannel> {
    return this.mutex.synchronize(async () => {
      if (!minDepositAmount && this.machinomyOptions && this.machinomyOptions.minimumChannelAmount) {
        minDepositAmount = new BigNumber.BigNumber(this.machinomyOptions.minimumChannelAmount)
      }
      let channel = await this.channelsDao.findUsable(sender, receiver, amount)
      return channel || this.internalOpenChannel(sender, receiver, amount, minDepositAmount)
    })
  }

  channels (): Promise<PaymentChannel[]> {
    return this.channelsDao.all()
  }

  openChannels (): Promise<PaymentChannel[]> {
    return this.channelsDao.allOpen()
  }

  settlingChannels (): Promise<PaymentChannel[]> {
    return this.channelsDao.allSettling()
  }

  async channelById (channelId: ChannelId | string): Promise<PaymentChannel | null> {
    let channel = await this.channelsDao.firstById(channelId)
    if (channel) {
      let channelC = await this.channelContract.channelById(channelId.toString())
      channel.value = channelC[2]
      return channel
    } else {
      return this.handleUnknownChannel(channelId)
    }
  }

  verifyToken (token: string): Promise<boolean> {
    return this.tokensDao.isPresent(token)
  }

  private internalOpenChannel (sender: string, receiver: string, amount: BigNumber.BigNumber, minDepositAmount: BigNumber.BigNumber = new BigNumber.BigNumber(0), channelId?: ChannelId | string): Promise<PaymentChannel> {
    let depositAmount = amount.times(10)

    if (minDepositAmount.greaterThan(0) && minDepositAmount.greaterThan(depositAmount)) {
      depositAmount = minDepositAmount
    }

    this.emit('willOpenChannel', sender, receiver, depositAmount)
    return this.buildChannel(sender, receiver, depositAmount, this.machinomyOptions.settlementPeriod || DEFAULT_SETTLEMENT_PERIOD, channelId)
      .then((paymentChannel: PaymentChannel) => this.channelsDao.save(paymentChannel).then(() => paymentChannel))
      .then((paymentChannel: PaymentChannel) => {
        this.emit('didOpenChannel', paymentChannel)
        return paymentChannel
      })
  }

  private async internalCloseChannel (channelId: ChannelId | string) {
    let channel = await this.channelById(channelId) || await this.handleUnknownChannel(channelId)

    if (!channel) {
      throw new Error(`Channel ${channelId} not found.`)
    }

    this.emit('willCloseChannel', channel)

    let res: Promise<TransactionResult>

    if (channel.sender === this.account) {
      res = this.settle(channel)
    } else {
      res = this.claim(channel)
    }

    const txn = await res
    this.emit('didCloseChannel', channel)
    return txn
  }

  private settle (channel: PaymentChannel): Promise<TransactionResult> {
    return this.channelContract.getState(channel.channelId).then((state: number) => {
      if (state === 2) {
        throw new Error(`Channel ${channel.channelId.toString()} is already settled.`)
      }

      switch (state) {
        case 0:
          return this.channelContract.startSettle(this.account, channel.channelId)
            .then((res: TransactionResult) => this.channelsDao.updateState(channel.channelId, 1).then(() => res))
        case 1:
          return this.channelContract.finishSettle(this.account, channel.channelId)
            .then((res: TransactionResult) => this.channelsDao.updateState(channel.channelId, 2).then(() => res))
        default:
          throw new Error(`Unknown state: ${state}`)
      }
    })
  }

  private async claim (channel: PaymentChannel): Promise<TransactionResult> {
    let payment = await this.paymentsDao.firstMaximum(channel.channelId)
    if (!payment) {
      throw new Error(`No payment found for channel ID ${channel.channelId.toString()}`)
    }
    let result = await this.channelContract.claim(channel.receiver, channel.channelId, payment.value, payment.signature)
    await this.channelsDao.updateState(channel.channelId, 2)
    return result
  }

  private async buildChannel (sender: string, receiver: string, price: BigNumber.BigNumber, settlementPeriod: number, channelId?: ChannelId | string): Promise<PaymentChannel> {
    const res = await this.channelContract.open(sender, receiver, price, settlementPeriod, channelId)
    const _channelId = res.logs[0].args.channelId
    return new PaymentChannel(sender, receiver, _channelId, price, new BigNumber.BigNumber(0), 0, undefined)
  }

  private async handleUnknownChannel (channelId: ChannelId | string): Promise<PaymentChannel | null> {
    channelId = channelId.toString()
    // tslint:disable-next-line:no-unused-variable
    const [sender, receiver, value, settlingPeriod, settlingUntil] = await this.channelContract.channelById(channelId)

    if (sender !== this.account && receiver !== this.account) {
      return null
    }

    const chan = new PaymentChannel(sender, receiver, channelId, value, new BigNumber.BigNumber(0), settlingUntil.eq(0) ? 0 : 1, undefined)
    await this.channelsDao.save(chan)
    return chan
  }

  private async findChannel (payment: Payment): Promise<PaymentChannel> {
    let chan = await this.channelsDao.findBySenderReceiverChannelId(payment.sender, payment.receiver, payment.channelId)

    if (chan) {
      return chan
    }

    chan = PaymentChannel.fromPayment(payment)
    chan.spent = new BigNumber.BigNumber(0)
    return chan
  }
}
