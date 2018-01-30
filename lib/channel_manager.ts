import * as BigNumber from 'bignumber.js'
import { PaymentChannel } from './paymentChannel'
import ChannelsDatabase from './storages/channels_database'
import { ChannelContract, ChannelId } from './channel'
import serviceRegistry from './container'
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
import log from './util/log'

const LOG = log('ChannelManager')

export interface ChannelManager extends EventEmitter {
  openChannel (sender: string, receiver: string, amount: BigNumber.BigNumber, minDepositAmount?: BigNumber.BigNumber): Promise<PaymentChannel>
  closeChannel (channelId: string | ChannelId): Promise<TransactionResult>
  nextPayment (channelId: string | ChannelId, amount: BigNumber.BigNumber, meta: string): Promise<Payment>
  acceptPayment (payment: Payment): Promise<string>
  requireOpenChannel (sender: string, receiver: string, amount: BigNumber.BigNumber, minDepositAmount?: BigNumber.BigNumber): Promise<PaymentChannel>
  channels (): Promise<PaymentChannel[]>
  openChannels (): Promise<PaymentChannel[]>
  channelById (channelId: ChannelId | string): Promise<PaymentChannel|null>
  verifyToken (token: string): Promise<boolean>
}

export default ChannelManager;

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

  openChannel (sender: string, receiver: string, amount: BigNumber.BigNumber, minDepositAmount?: BigNumber.BigNumber): Promise<PaymentChannel> {
    return this.mutex.synchronize(() => this.internalOpenChannel(sender, receiver, amount, minDepositAmount))
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

      return Payment.fromPaymentChannel(this.web3, channel, new PaymentRequired(channel.receiver, toSpend, '', meta))
    }))
  }

  acceptPayment (payment: Payment): Promise<string> {
    LOG(`Queueing payment of ${payment.price.toString()} Wei to channel with ID ${payment.channelId}.`)

    return this.mutex.synchronize(() => this.channelsDao.findBySenderReceiverChannelId(payment.sender, payment.receiver, payment.channelId).then(() => {
      const channel = PaymentChannel.fromPayment(payment)

      LOG(`Adding ${payment.price.toString()} Wei to channel with ID ${channel.channelId.toString()}.`)

      if (!isPaymentValid(payment, channel)) {
        throw new Error('Invalid payment.')
      }

      const token = this.web3.sha3(JSON.stringify(payment)).toString()
      return this.channelsDao.saveOrUpdate(channel)
        .then(() => this.tokensDao.save(token, payment.channelId))
        .then(() => this.paymentsDao.save(token, payment))
        .then(() => token)
    }))
  }

  requireOpenChannel (sender: string, receiver: string, amount: BigNumber.BigNumber, minDepositAmount?: BigNumber.BigNumber): Promise<PaymentChannel> {
    return this.mutex.synchronize(() => {
      return this.channelsDao.findUsable(sender, receiver, amount).then((channel: PaymentChannel) => {
        return channel || this.internalOpenChannel(sender, receiver, amount, minDepositAmount)
      })
    })
  }

  channels (): Promise<PaymentChannel[]> {
    return this.channelsDao.all()
  }

  openChannels (): Promise<PaymentChannel[]> {
    return this.channelsDao.allOpen()
  }

  channelById (channelId: ChannelId | string): Promise<PaymentChannel | null> {
    return this.channelsDao.firstById(channelId)
  }

  verifyToken (token: string): Promise<boolean> {
    return this.tokensDao.isPresent(token)
  }

  private internalOpenChannel (sender: string, receiver: string, amount: BigNumber.BigNumber, minDepositAmount: BigNumber.BigNumber = new BigNumber.BigNumber(0)): Promise<PaymentChannel> {
    let depositAmount = amount.times(10)

    if (minDepositAmount.greaterThan(0) && minDepositAmount.greaterThan(depositAmount)) {
      depositAmount = minDepositAmount
    }

    this.emit('willOpenChannel', sender, receiver, depositAmount)
    const paymentReq = new PaymentRequired(receiver, depositAmount, '', '')
    return this.channelContract.buildPaymentChannel(sender, paymentReq, depositAmount, DEFAULT_SETTLEMENT_PERIOD)
      .then((paymentChannel: PaymentChannel) => this.channelsDao.save(paymentChannel).then(() => paymentChannel))
      .then((paymentChannel: PaymentChannel) => {
        this.emit('didOpenChannel', paymentChannel)
        return paymentChannel
      })
  }

  private settle (channel: PaymentChannel): Promise<TransactionResult> {
    return this.channelContract.getState(channel).then((state: number) => {
      if (state === 2) {
        throw new Error(`Channel ${channel.channelId.toString()} is already settled.`)
      }

      switch (state) {
        case 0:
          return this.channelContract.startSettle(this.account, channel, new BigNumber.BigNumber(channel.spent))
            .then((res: TransactionResult) => this.channelsDao.updateState(channel.channelId, 1).then(() => res))
        case 1:
          return this.channelContract.finishSettle(this.account, channel)
            .then((res: TransactionResult) => this.channelsDao.updateState(channel.channelId, 2).then(() => res))
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
        .then((res: TransactionResult) => this.channelsDao.updateState(channel.channelId, 2).then(() => res))
    })
  }
}

serviceRegistry.bind('ChannelManager',
  (
    account: string,
    web3: Web3,
    channelsDao: ChannelsDatabase,
    paymentsDao: PaymentsDatabase,
    tokensDao: TokensDatabase,
    channelContract: ChannelContract
  ) => new ChannelManagerImpl(account, web3, channelsDao, paymentsDao, tokensDao, channelContract),
  ['account', 'Web3', 'ChannelsDatabase', 'PaymentsDatabase', 'TokensDatabase', 'ChannelContract'])
