import ChannelId from '../../ChannelId'
import * as BigNumber from 'bignumber.js'
import { PaymentChannel, PaymentChannelJSON } from '../../PaymentChannel'
import EngineSqlite from './EngineSqlite'
import AbstractChannelsDatabase from '../AbstractChannelsDatabase'

export default class SqliteChannelsDatabase extends AbstractChannelsDatabase<EngineSqlite> {
  async save (paymentChannel: PaymentChannel): Promise<void> {
    return this.engine.exec(async client => {
      await client.run(
        'INSERT INTO channel("channelId", kind, sender, receiver, value, spent, state, "tokenContract", "settlementPeriod") ' +
        'VALUES ($channelId, $kind, $sender, $receiver, $value, $spent, $state, $tokenContract, $settlementPeriod)',
        {
          $channelId: paymentChannel.channelId,
          $kind: this.kind,
          $sender: paymentChannel.sender,
          $receiver: paymentChannel.receiver,
          $value: paymentChannel.value.toString(),
          $spent: paymentChannel.spent.toString(),
          $state: paymentChannel.state,
          $tokenContract: paymentChannel.tokenContract,
          $settlementPeriod: paymentChannel.settlementPeriod
        })
    })
  }

  async firstById (channelId: ChannelId | string): Promise<PaymentChannel | null> {
    return this.engine.exec(async client => {
      let raw = await client.get<PaymentChannelJSON>(
        'SELECT "channelId", kind, sender, receiver, value, spent, state, "tokenContract", "settlementPeriod" FROM channel ' +
        'WHERE "channelId" = $channelId LIMIT 1',
        {
          $channelId: channelId.toString()
        })
      return raw ? this.inflatePaymentChannel(raw) : null
    })
  }

  async spend (channelId: ChannelId | string, spent: BigNumber.BigNumber): Promise<void> {
    return this.engine.exec(async client => {
      return client.run(
        'UPDATE channel SET spent = $spent WHERE "channelId" = $channelId',
        {
          $channelId: channelId.toString(),
          $spent: spent.toString()
        })
    })
  }

  async deposit (channelId: ChannelId | string, value: BigNumber.BigNumber): Promise<void> {
    return this.engine.exec(async client => {
      let channel = await this.firstById(channelId)
      if (!channel) {
        throw new Error('Channel not found.')
      }

      const newValue = channel.value.add(value)

      return client.run(
        'UPDATE channel SET value = $value WHERE "channelId" = $channelId',
        {
          $channelId: channelId.toString(),
          $value: newValue.toString()
        })
    })
  }

  async all (): Promise<Array<PaymentChannel>> {
    return this.engine.exec(async client => {
      let raw = await client.all<PaymentChannelJSON>('SELECT "channelId", kind, sender, receiver, value, spent, state, "tokenContract", "settlementPeriod" FROM channel')
      return this.inflatePaymentChannels(raw)
    })
  }

  async allOpen (): Promise<Array<PaymentChannel>> {
    return this.engine.exec(async client => {
      let raw = await client.all<PaymentChannelJSON>('SELECT "channelId", kind, sender, receiver, value, spent, state, "tokenContract", "settlementPeriod" FROM channel ' +
        'WHERE state = 0')
      let channels = await this.inflatePaymentChannels(raw)
      return this.filterByState(0, channels)
    })
  }

  async findUsable (sender: string, receiver: string, amount: BigNumber.BigNumber): Promise<PaymentChannel | null> {
    return this.engine.exec(async client => {
      let raw = await client.get<PaymentChannelJSON>('SELECT "channelId", kind, sender, receiver, value, spent, state, "tokenContract", "settlementPeriod" FROM channel ' +
        'WHERE sender = $sender AND receiver = $receiver AND value >= spent + $amount AND state = 0',
        {
          $sender: sender,
          $receiver: receiver,
          $amount: amount.toString()
        })
      if (raw) {
        let channel = await this.inflatePaymentChannel(raw)
        if (channel && channel.state === 0) {
          return channel
        }
        return null
      } else {
        return null
      }
    })
  }

  async findBySenderReceiver (sender: string, receiver: string): Promise<Array<PaymentChannel>> {
    return this.engine.exec(async client => {
      let rows = await client.all<PaymentChannelJSON>('SELECT "channelId", kind, sender, receiver, value, spent, state, "tokenContract", "settlementPeriod" FROM channel ' +
        'WHERE sender = $sender AND receiver = $receiver',
        {
          $sender: sender,
          $receiver: receiver
        })
      return this.inflatePaymentChannels(rows)
    })
  }

  async findBySenderReceiverChannelId (sender: string, receiver: string, channelId: ChannelId | string): Promise<PaymentChannel | null> {
    return this.engine.exec(async client => {
      let row = await client.get<PaymentChannelJSON>('SELECT "channelId", kind, sender, receiver, value, spent, state, "tokenContract", "settlementPeriod" FROM channel ' +
        'WHERE sender = $sender AND receiver = $receiver AND "channelId" = $channelId LIMIT 1',
        {
          $sender: sender,
          $receiver: receiver,
          $channelId: channelId.toString()
        })
      return row ? this.inflatePaymentChannel(row) : null
    })
  }

  async updateState (channelId: ChannelId | string, state: number): Promise<void> {
    return this.engine.exec(async client => {
      return client.run('UPDATE channel SET state = $state WHERE "channelId" = $channelId',
        {
          $state: state,
          $channelId: channelId.toString()
        })
    })
  }
}
