import ChainCache from './ChainCache'
import IChannelsDatabase from './storage/IChannelsDatabase'
import PaymentManager from './PaymentManager'
import ChannelContract from './ChannelContract'
import { TransactionResult } from 'truffle-contract'
import Mutex from './Mutex'
import Payment from './payment'
import MachinomyOptions from './MachinomyOptions'
import IChannelManager from './IChannelManager'
import * as BigNumber from 'bignumber.js'
import ChannelId from './ChannelId'
import { EventEmitter } from 'events'
import * as Web3 from 'web3'
import IPaymentsDatabase from './storage/IPaymentsDatabase'
import ITokensDatabase from './storage/ITokensDatabase'
import Logger from '@machinomy/logger'
import { PaymentChannel } from './PaymentChannel'
import ChannelInflator from './ChannelInflator'
import * as uuid from 'uuid'
import { PaymentNotValid } from './Exceptions'

const LOG = new Logger('channel-manager')

const DAY_IN_SECONDS = 86400

export default class ChannelManager extends EventEmitter implements IChannelManager {
  /** Default settlement period for a payment channel */
  static DEFAULT_SETTLEMENT_PERIOD = 2 * DAY_IN_SECONDS

  private account: string

  private web3: Web3

  private channelsDao: IChannelsDatabase

  private paymentsDao: IPaymentsDatabase

  private tokensDao: ITokensDatabase

  private channelContract: ChannelContract

  private paymentManager: PaymentManager

  private mutex: Mutex = new Mutex()

  private chainCache: ChainCache

  private machinomyOptions: MachinomyOptions

  constructor (account: string, web3: Web3, channelsDao: IChannelsDatabase, paymentsDao: IPaymentsDatabase, tokensDao: ITokensDatabase, channelContract: ChannelContract, paymentManager: PaymentManager, chainCache: ChainCache, machinomyOptions: MachinomyOptions) {
    super()
    this.account = account
    this.web3 = web3
    this.channelsDao = channelsDao
    this.paymentsDao = paymentsDao
    this.tokensDao = tokensDao
    this.channelContract = channelContract
    this.paymentManager = paymentManager
    this.machinomyOptions = machinomyOptions
    this.chainCache = chainCache
  }
  openChannel (sender: string, receiver: string, amount: BigNumber.BigNumber, minDepositAmount?: BigNumber.BigNumber, channelId?: ChannelId | string, tokenContract?: string): Promise<PaymentChannel> {
    return this.mutex.synchronize(() => this.internalOpenChannel(sender, receiver, amount, minDepositAmount, channelId, tokenContract))
  }

  closeChannel (channelId: string | ChannelId): Promise<TransactionResult> {
    return this.mutex.synchronizeOn(channelId.toString(), () => this.internalCloseChannel(channelId))
  }

  deposit (channelId: string, value: BigNumber.BigNumber): Promise<TransactionResult> {
    return this.mutex.synchronizeOn(channelId, async () => {
      const channel = await this.channelById(channelId)

      if (!channel) {
        throw new Error('No payment channel found.')
      }

      const res = await this.channelContract.deposit(this.account, channelId, value, channel.tokenContract)
      await this.channelsDao.deposit(channelId, value)
      return res
    })
  }

  nextPayment (channelId: string | ChannelId, amount: BigNumber.BigNumber, meta: string): Promise<Payment> {
    return this.mutex.synchronizeOn(channelId.toString(), async () => {
      const channel = await this.channelById(channelId)

      if (!channel) {
        throw new Error(`Channel with id ${channelId.toString()} not found.`)
      }

      const toSpend = channel.spent.add(amount)

      if (toSpend.greaterThan(channel.value)) {
        throw new Error(`Total spend ${toSpend.toString()} is larger than channel value ${channel.value.toString()}`)
      }

      return this.paymentManager.buildPaymentForChannel(channel, amount, toSpend, meta)
    })
  }

  async spendChannel (payment: Payment, token?: string): Promise<Payment> {
    const chan = PaymentChannel.fromPayment(payment)
    await this.channelsDao.saveOrUpdate(chan)
    let _token = token || payment.token || uuid.v4().replace(/-/g, '')
    await this.paymentsDao.save(_token, payment)
    return payment
  }

  async acceptPayment (payment: Payment): Promise<string> {
    const isPaymentInTokens = ChannelInflator.isTokenContractDefined(payment.tokenContract)
    if (isPaymentInTokens) {
      LOG.info(`Queueing payment of ${payment.price.toString()} token(s) to channel with ID ${payment.channelId}.`)
    } else {
      LOG.info(`Queueing payment of ${payment.price.toString()} Wei to channel with ID ${payment.channelId}.`)
    }

    return this.mutex.synchronizeOn(payment.channelId, async () => {
      const channel = await this.findChannel(payment)

      if (isPaymentInTokens) {
        LOG.info(`Adding ${payment.price.toString()} token(s) to channel with ID ${channel.channelId.toString()}.`)
      } else {
        LOG.info(`Adding ${payment.price.toString()} Wei to channel with ID ${channel.channelId.toString()}.`)
      }
      const valid = await this.paymentManager.isValid(payment, channel)

      if (valid) {
        channel.spent = payment.value
        const token = this.web3.sha3(JSON.stringify(payment)).toString()
        await this.channelsDao.saveOrUpdate(channel)
        await this.tokensDao.save(token, payment.channelId)
        await this.paymentsDao.save(token, payment)
        return token
      }

      if (this.machinomyOptions.closeOnInvalidPayment) {
        LOG.info(`Received invalid payment from ${payment.sender}!`)
        const existingChannel = await this.channelsDao.findBySenderReceiverChannelId(payment.sender, payment.receiver, payment.channelId)

        if (existingChannel) {
          LOG.info(`Found existing channel with id ${payment.channelId} between ${payment.sender} and ${payment.receiver}.`)
          LOG.info('Closing channel due to malfeasance.')
          await this.internalCloseChannel(channel.channelId)
        }
      }

      throw new PaymentNotValid()
    })
  }

  requireOpenChannel (sender: string, receiver: string, amount: BigNumber.BigNumber, minDepositAmount?: BigNumber.BigNumber, tokenContract?: string): Promise<PaymentChannel> {
    return this.mutex.synchronize(async () => {
      if (!minDepositAmount && this.machinomyOptions && this.machinomyOptions.minimumChannelAmount) {
        minDepositAmount = new BigNumber.BigNumber(this.machinomyOptions.minimumChannelAmount)
      }
      let channel = await this.channelsDao.findUsable(sender, receiver, amount)
      return channel || this.internalOpenChannel(sender, receiver, amount, minDepositAmount, undefined, tokenContract)
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
      if (this.chainCache.cached(channelId.toString()).isStale()) {
        let channelC = await this.channelContract.channelById(channelId.toString())
        const settlementPeriod = await this.channelContract.getSettlementPeriod(channelId.toString())
        channel.value = channelC[2]
        this.chainCache.cached(channelId.toString()).setData(channel.state, channelC[2], settlementPeriod)
      } else {
        channel.value = this.chainCache.cached(channelId.toString()).value()
      }
      return channel
    } else {
      return this.handleUnknownChannel(channelId)
    }
  }

  verifyToken (token: string): Promise<boolean> {
    return this.tokensDao.isPresent(token)
  }

  private async internalOpenChannel (sender: string, receiver: string, amount: BigNumber.BigNumber, minDepositAmount: BigNumber.BigNumber = new BigNumber.BigNumber(0), channelId?: ChannelId | string, tokenContract?: string): Promise<PaymentChannel> {
    let depositAmount = amount.times(10)

    if (minDepositAmount.greaterThan(0) && minDepositAmount.greaterThan(depositAmount)) {
      depositAmount = minDepositAmount
    }

    this.emit('willOpenChannel', sender, receiver, depositAmount)
    let settlementPeriod = this.machinomyOptions.settlementPeriod || ChannelManager.DEFAULT_SETTLEMENT_PERIOD
    let paymentChannel = await this.buildChannel(sender, receiver, depositAmount, settlementPeriod, channelId, tokenContract)
    await this.channelsDao.save(paymentChannel)
    this.emit('didOpenChannel', paymentChannel)
    return paymentChannel
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

  private async buildChannel (sender: string, receiver: string, price: BigNumber.BigNumber, settlementPeriod: number, channelId?: ChannelId | string, tokenContract?: string): Promise<PaymentChannel> {
    const res = await this.channelContract.open(sender, receiver, price, settlementPeriod, channelId, tokenContract)
    const _channelId = res.logs[0].args.channelId
    return new PaymentChannel(sender, receiver, _channelId, price, new BigNumber.BigNumber(0), 0, tokenContract)
  }

  private async handleUnknownChannel (channelId: ChannelId | string): Promise<PaymentChannel | null> {
    channelId = channelId.toString()
    // tslint:disable-next-line:no-unused-variable
    const [sender, receiver, value, settlingPeriod, settlingUntil] = await this.channelContract.channelById(channelId)

    if (sender !== this.account && receiver !== this.account) {
      return null
    }

    const chan = new PaymentChannel(sender, receiver, channelId, value, new BigNumber.BigNumber(0), settlingUntil.eq(0) ? 0 : 1, '')
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
