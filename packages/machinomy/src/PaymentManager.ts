import * as BigNumber from 'bignumber.js'
import ChainCache from './ChainCache'
import ChainManager from './ChainManager'
import { PaymentChannel } from './PaymentChannel'
import Payment from './payment'
import ChannelContract from './ChannelContract'
import MachinomyOptions from './MachinomyOptions'
import PaymentValidation from './PaymentValidation'

export default class PaymentManager {
  private chainManager: ChainManager

  private channelContract: ChannelContract

  private chainCache: ChainCache

  private options: MachinomyOptions

  constructor (chainManager: ChainManager, channelContract: ChannelContract, chainCache: ChainCache, options: MachinomyOptions) {
    this.chainManager = chainManager
    this.channelContract = channelContract
    this.chainCache = chainCache
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
      tokenContract: channel.tokenContract,
      token: undefined
    })
  }

  async isValid (payment: Payment, paymentChannel: PaymentChannel): Promise<boolean> {
    let validation = new PaymentValidation(this.channelContract, payment, paymentChannel, this.chainCache, this.options)
    return validation.isValid()
  }
}
