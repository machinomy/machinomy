import * as BigNumber from 'bignumber.js'
import { PaymentChannel } from './paymentChannel'
import ChannelsDatabase from './storages/channels_database'
import { ChannelContract, ChannelId } from './channel'
import ServiceContext from './container'
import { EventEmitter } from 'events'
import Mutex from './util/mutex'
import { PaymentRequired } from './transport'
import { DEFAULT_SETTLEMENT_PERIOD } from './sender'
import { TransactionResult } from 'truffle-contract'
import PaymentsDatabase from './storages/payments_database'
import Payment from './Payment'
import Web3 = require('web3')
import { isPaymentValid } from './receiver'
import TokensDatabase from './storages/tokens_database'

export default interface ChannelManager extends EventEmitter {
  openChannel (sender: string, receiver: string, amount: BigNumber.BigNumber): Promise<PaymentChannel>
  closeChannel (channelId: string | ChannelId): Promise<TransactionResult>
  nextPayment (channelId: string | ChannelId, amount: BigNumber.BigNumber, meta: string): Promise<Payment>
  acceptPayment (payment: Payment): Promise<string>
  requireOpenChannel (sender: string, receiver: string, amount: BigNumber.BigNumber): Promise<PaymentChannel>
  channels (): Promise<PaymentChannel[]>
  channelById (channelId: ChannelId | string): Promise<PaymentChannel|null>
}

export class ChannelManagerImpl extends EventEmitter implements ChannelManager {
  private account: string

  private web3: Web3

  private channelsDao: ChannelsDatabase

  private paymentsDao: PaymentsDatabase

  private tokensDao: TokensDatabase

  private channelContract: ChannelContract

  private mutex: Mutex = new Mutex()

  constructor (account: string, web3: Web3, channelsDao: ChannelsDatabase, paymentsDao: PaymentsDatabase, tokensDao: TokensDatabase, channelContract: ChannelContract) {
    super()
    this.account = account
    this.web3 = web3
    this.channelsDao = channelsDao
    this.paymentsDao = paymentsDao
    this.tokensDao = tokensDao
    this.channelContract = channelContract
  }

  openChannel (sender: string, receiver: string, amount: BigNumber.BigNumber): Promise<PaymentChannel> {
    return this.mutex.synchronize(() => this.internalOpenChannel(sender, receiver, amount))
  }

  closeChannel (channelId: string | ChannelId): Promise<TransactionResult> {
    return this.mutex.synchronize(() => this.channelById(channelId).then((channel: PaymentChannel | null) => {
      if (!channel) {
        throw new Error(`Channel with id ${channelId.toString()} not found.`)
      }

      this.emit('willCloseChannel', channel)

      let res: Promise<TransactionResult>

      if (channel.sender === this.account) {
        res = this.settle(channel)
      } else {
        res = this.claim(channel)
      }

      return res.then((txn: TransactionResult) => {
        this.emit('didCloseChannel', channel)
        return txn
      })
    }))
  }

  nextPayment (channelId: string | ChannelId, amount: BigNumber.BigNumber, meta: string): Promise<Payment> {
    return this.mutex.synchronize(() => this.channelById(channelId).then((channel: PaymentChannel | null) => {
      if (!channel) {
        throw new Error(`Channel with id ${channelId.toString()} not found.`)
      }

      const toSpend = channel.spent.add(amount)

      if (toSpend.greaterThan(channel.value)) {
        throw new Error(`Total spend ${toSpend.toString()} is larger than channel value ${channel.value.toString()}`)
      }

      return Payment.fromPaymentChannel(this.web3, channel, new PaymentRequired(channel.receiver, amount, '', meta))
    }))
  }

  acceptPayment (payment: Payment): Promise<string> {
    return this.mutex.synchronize(() => this.channelsDao.findBySenderReceiverChannelId(payment.sender, payment.receiver, payment.channelId).then((channels: PaymentChannel[]) => {
      if (!channels.length) {
        throw new Error(`No channel with id ${payment.channelId} found.`)
      }

      const channel = channels[0]

      if (!isPaymentValid(payment, channel)) {
        throw new Error('Invalid payment.')
      }

      const paymentChannel = PaymentChannel.fromPayment(payment)
      const token = this.web3.sha3(JSON.stringify(payment)).toString()
      return this.channelsDao.saveOrUpdate(paymentChannel)
        .then(() => this.tokensDao.save(token, payment.channelId))
        .then(() => this.paymentsDao.save(token, payment))
        .then(() => token)
    }))
  }

  requireOpenChannel (sender: string, receiver: string, amount: BigNumber.BigNumber): Promise<PaymentChannel> {
    return this.mutex.synchronize(() => {
      return this.channelsDao.findUsable(sender, receiver, amount).then((channel: PaymentChannel) => {
        return channel || this.internalOpenChannel(sender, receiver, amount)
      })
    })
  }

  channels (): Promise<PaymentChannel[]> {
    return this.channelsDao.all()
  }

  channelById (channelId: ChannelId | string): Promise<PaymentChannel | null> {
    return this.channelsDao.firstById(channelId)
  }

  private internalOpenChannel (sender: string, receiver: string, amount: BigNumber.BigNumber): Promise<PaymentChannel> {
    this.emit('willOpenChannel', sender, receiver, amount)
    const paymentReq = new PaymentRequired(receiver, amount, '', '')
    return this.channelContract.buildPaymentChannel(sender, paymentReq, amount, DEFAULT_SETTLEMENT_PERIOD)
      .then((paymentChannel: PaymentChannel) => this.channelsDao.save(paymentChannel).then(() => paymentChannel))
      .then((paymentChannel: PaymentChannel) => {
        this.emit('didOpenChannel', paymentChannel)
        return paymentChannel
      })
  }

  private settle (channel: PaymentChannel): Promise<TransactionResult> {
    return this.channelContract.getState(channel).then((state: number) => {
      switch (state) {
        case 0:
          return this.channelContract.startSettle(this.account, channel, new BigNumber.BigNumber(channel.spent))
        case 1:
          return this.channelContract.finishSettle(this.account, channel)
        default:
          throw new Error(`Unknown state: ${state}`)
      }
    })
  }

  private claim (channel: PaymentChannel): Promise<TransactionResult> {
    return this.paymentsDao.firstMaximum(channel.channelId).then((payment: Payment) => {
      if (!payment) {
        throw new Error(`No payment found for channel ID ${channel.channelId.toString()}`)
      }

      return this.channelContract.claim(channel.receiver, channel, payment.value, Number(payment.v), payment.r, payment.s)
    })
  }
}

ServiceContext.bind('ChannelManager',
  (
    account: string,
    web3: Web3,
    channelsDao: ChannelsDatabase,
    paymentsDao: PaymentsDatabase,
    tokensDao: TokensDatabase,
    channelContract: ChannelContract
  ) => new ChannelManagerImpl(account, web3, channelsDao, paymentsDao, tokensDao, channelContract),
  ['account', 'Web3', 'ChannelsDatabase', 'PaymentsDatabase', 'TokensDatabase', 'ChannelContract'])
