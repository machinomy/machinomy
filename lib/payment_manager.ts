import * as BigNumber from 'bignumber.js'
import ChainManager from './chain_manager'
import { PaymentChannel } from './payment_channel'
import Payment from './payment'
import ChannelContract from './channel_contract'
import { MachinomyOptions } from '../MachinomyOptions'
import { DEFAULT_SETTLEMENT_PERIOD } from './channel_manager'
import log from './util/log'

const LOG = log('PaymentManager')

export default class PaymentManager {
  private chainManager: ChainManager

  private channelContract: ChannelContract

  private options: MachinomyOptions

  constructor (chainManager: ChainManager, channelContract: ChannelContract, options: MachinomyOptions) {
    this.chainManager = chainManager
    this.channelContract = channelContract
    this.options = options
  }

  async buildPaymentForChannel (channel: PaymentChannel, price: BigNumber.BigNumber, totalValue: BigNumber.BigNumber, meta: string): Promise<Payment> {
    const digest = await this.channelContract.paymentDigest(channel.channelId, totalValue)
    const signature = await this.chainManager.sign(channel.sender, digest)

    return new Payment({
      channelId: channel.channelId,
      sender: channel.sender,
      receiver: channel.receiver,
      price,
      value: totalValue,
      channelValue: channel.value,
      signature,
      meta,
      contractAddress: channel.contractAddress,
      token: undefined
    })
  }

  async isValid (payment: Payment, paymentChannel: PaymentChannel): Promise<boolean> {
    const validIncrement = paymentChannel.spent.plus(payment.price).equals(payment.value)
    if (!validIncrement) {
      LOG(`payment is invalid because the price increment is too large. payment channel already spent: ${paymentChannel.spent}, payment: %o`, payment)
      return false
    }
    const validChannelValue = paymentChannel.value.equals(payment.channelValue)
    if (!validChannelValue) {
      LOG(`payment is invalid because payment value does not match payment channel value. payment channel value: ${paymentChannel.value}, payment: %o`, payment)
      return false
    }
    const validChannelId = paymentChannel.channelId === payment.channelId
    if (!validChannelId) {
      LOG(`payment is invalid because channel id does not match. expected: ${paymentChannel.channelId}, payment: %o`, payment)
      return false
    }
    const validPaymentValue = paymentChannel.value.lessThanOrEqualTo(payment.channelValue)
    if (!validPaymentValue) {
      LOG(`payment is invalid because the payment value exceeds the channel value. channel value: ${paymentChannel.value}, payment: %o`, payment)
      return false
    }
    const validSender = paymentChannel.sender === payment.sender
    if (!validSender) {
      LOG(`payment is invalid because the sender does not match. channel sender: ${paymentChannel.sender}, payment: %o`, payment)
      return false
    }
    const isPositive = payment.value.greaterThanOrEqualTo(new BigNumber.BigNumber(0)) && payment.price.greaterThanOrEqualTo(new BigNumber.BigNumber(0))
    if (!isPositive) {
      LOG(`payment is invalid because the price or value is negative. payment: %o`, payment)
      return false
    }
    const canClaim = await this.channelContract.canClaim(payment.channelId, payment.value, payment.receiver, payment.signature)
    if (!canClaim) {
      LOG(`payment is invalid because the channel contract cannot claim it. payment: %o`, payment)
      return false
    }
    const settlementPeriod = await this.channelContract.getSettlementPeriod(payment.channelId)
    const minSettlementPeriod = new BigNumber.BigNumber(this.options.minimumSettlementPeriod || DEFAULT_SETTLEMENT_PERIOD)
    const isAboveMinSettlementPeriod = minSettlementPeriod.lessThanOrEqualTo(settlementPeriod)
    if (!isAboveMinSettlementPeriod) {
      LOG(`payment is invalid because the settlement period is too short. settlement period: ${settlementPeriod}, minimum: ${minSettlementPeriod}. payment: %o`, payment)
      return false
    }

    return true
  }
}
