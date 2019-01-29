import AbstractChannelsDatabase from '../AbstractChannelsDatabase'
import * as BigNumber from 'bignumber.js'
import IChannelsDatabase from '../IChannelsDatabase'
import EngineNedb from './EngineNedb'
import ChannelId from '../../ChannelId'
import { PaymentChannel, PaymentChannelJSON } from '../../PaymentChannel'

/**
 * Database layer for {PaymentChannel}
 */
export default class NedbChannelsDatabase extends AbstractChannelsDatabase<EngineNedb> implements IChannelsDatabase {
  async save (paymentChannel: PaymentChannel): Promise<void> {
    const document = {
      kind: this.kind,
      sender: paymentChannel.sender,
      receiver: paymentChannel.receiver,
      value: paymentChannel.value.toString(),
      spent: paymentChannel.spent.toString(),
      channelId: paymentChannel.channelId,
      state: paymentChannel.state,
      tokenContract: paymentChannel.tokenContract,
      settlementPeriod: paymentChannel.settlementPeriod,
      settlingUntil: paymentChannel.settlingUntil
    }

    await this.engine.exec(client => {
      return client.insert(document)
    })
  }

  async firstById (channelId: ChannelId | string): Promise<PaymentChannel | null> {
    const query = {
      kind: this.kind,
      channelId: channelId.toString()
    }

    return this.engine.exec(async client => {
      let doc = await client.find<PaymentChannelJSON>(query)
      return this.inflatePaymentChannel(doc[0])
    })
  }

  /**
   * Set amount of money spent on the channel.
   */
  async spend (channelId: ChannelId | string, spent: BigNumber.BigNumber): Promise<void> {
    const query = {
      kind: this.kind,
      channelId: channelId.toString()
    }
    const update = {
      $set: {
        spent: spent.toString()
      }
    }

    await this.engine.exec(client => {
      return client.update(query, update, {})
    })
  }

  async deposit (channelId: ChannelId | string, value: BigNumber.BigNumber): Promise<void> {
    const channel = await this.firstById(channelId)
    if (!channel) {
      throw new Error('Channel not found.')
    }
    const query = { kind: this.kind, channelId: channelId.toString() }
    const newValue = channel.value.add(value)
    const update = {
      $set: {
        value: newValue.toString()
      }
    }
    await this.engine.exec(client => {
      return client.update(query, update, {})
    })
  }

  /**
   * Retrieve all the payment channels stored.
   *
   * @return {Promise<PaymentChannel>}
   */
  async all (): Promise<Array<PaymentChannel>> {
    let raw = await this.engine.exec(client => {
      return client.find<PaymentChannelJSON>({ kind: this.kind })
    })
    return this.inflatePaymentChannels(raw)
  }

  async allOpen (): Promise<PaymentChannel[]> {
    let raw = await this.engine.exec(client => {
      return client.find<PaymentChannelJSON>({ kind: this.kind, state: 0 })
    })
    let channels = await this.inflatePaymentChannels(raw)
    return this.filterByState(0, channels)
  }

  async findUsable (sender: string, receiver: string, amount: BigNumber.BigNumber): Promise<PaymentChannel | null> {
    const query = {
      kind: this.kind,
      state: 0,
      sender,
      receiver
    }
    let raw = await this.engine.exec(client => {
      return client.find<PaymentChannelJSON>(query)
    })
    let channels = await this.inflatePaymentChannels(raw)
    let filtered = this.filterByState(0, channels)
    return filtered.find((chan: PaymentChannel) => chan.value.greaterThanOrEqualTo(chan.spent.add(amount))) || null
  }

  async findBySenderReceiver (sender: string, receiver: string): Promise<Array<PaymentChannel>> {
    let raw = await this.engine.exec(client => {
      return client.find<PaymentChannelJSON>({ sender, receiver, kind: this.kind })
    })
    return this.inflatePaymentChannels(raw)
  }

  async findBySenderReceiverChannelId (sender: string, receiver: string, channelId: ChannelId | string): Promise<PaymentChannel | null> {
    let query = {
      sender,
      receiver,
      channelId: channelId.toString(),
      kind: this.kind
    }
    let res = await this.engine.exec(client => {
      return client.find<PaymentChannelJSON>(query)
    })
    return this.inflatePaymentChannel(res[0])
  }

  async updateState (channelId: ChannelId | string, state: number): Promise<void> {
    const query = {
      kind: this.kind,
      channelId: channelId.toString()
    }
    const update = {
      $set: {
        state
      }
    }
    await this.engine.exec(client => {
      return client.update(query, update, {})
    })
  }
}
