import { PaymentChannel, PaymentChannelJSON } from '../PaymentChannel'
import * as BigNumber from 'bignumber.js'
import { namespaced } from '../util/namespaced'
import IEngine from './IEngine'
import ChannelId from '../ChannelId'
import IChannelsDatabase from './IChannelsDatabase'
import Logger from '@machinomy/logger'
import ChannelInflator from '../ChannelInflator'

const LOG = new Logger('abstract-channels-database')

export default abstract class AbstractChannelsDatabase<T extends IEngine> implements IChannelsDatabase {
  engine: T

  kind: string

  inflator: ChannelInflator

  constructor (engine: T, inflator: ChannelInflator, namespace: string | null) {
    this.kind = namespaced(namespace, 'channel')
    this.engine = engine
    this.inflator = inflator
  }

  inflatePaymentChannels (channels: Array<PaymentChannelJSON>): Promise<Array<PaymentChannel>> {
    if (!channels.length) {
      return Promise.resolve([])
    }

    // There shouldn't be any nulls here.
    return Promise.all(channels.map((chan: PaymentChannelJSON) => this.inflatePaymentChannel(chan))) as Promise<Array<PaymentChannel>>
  }

  async inflatePaymentChannel (json: PaymentChannelJSON): Promise<PaymentChannel | null> {
    if (!json) {
      return Promise.resolve(null)
    } else {
      return this.inflator.inflate(json)
    }
  }

  filterByState (state: number, channels: PaymentChannel[]): PaymentChannel[] {
    return channels.filter((chan: PaymentChannel) => chan ? chan.state === state : false)
  }

  abstract save (paymentChannel: PaymentChannel): Promise<void>

  saveOrUpdate (paymentChannel: PaymentChannel): Promise<void> {
    LOG.info(`Saving or updating channel with ID ${paymentChannel.channelId.toString()}`)

    return this.firstById(paymentChannel.channelId).then((found: PaymentChannel | null) => {
      if (found) {
        LOG.info(`Spending channel with ID ${paymentChannel.channelId.toString()}`)
        return this.spend(paymentChannel.channelId, paymentChannel.spent)
      } else {
        LOG.info(`Spending channel with ID ${paymentChannel.channelId.toString()}`)
        return this.save(paymentChannel)
      }
    })
  }

  abstract deposit (channelId: ChannelId | string, value: BigNumber.BigNumber): Promise<void>

  abstract firstById (channelId: ChannelId | string): Promise<PaymentChannel | null>

  abstract spend (channelId: ChannelId | string, spent: BigNumber.BigNumber): Promise<void>

  abstract all (): Promise<Array<PaymentChannel>>

  abstract allOpen (): Promise<PaymentChannel[]>

  async allSettling (): Promise<PaymentChannel[]> {
    const all = await this.all()
    return this.filterByState(1, all)
  }

  abstract findUsable (sender: string, receiver: string, amount: BigNumber.BigNumber): Promise<PaymentChannel | null>

  abstract findBySenderReceiver (sender: string, receiver: string): Promise<Array<PaymentChannel>>

  abstract findBySenderReceiverChannelId (sender: string, receiver: string, channelId: ChannelId | string): Promise<PaymentChannel | null>

  abstract updateState (channelId: ChannelId | string, state: number): Promise<void>
}
