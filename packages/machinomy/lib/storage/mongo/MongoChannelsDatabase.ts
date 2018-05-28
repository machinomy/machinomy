import AbstractChannelsDatabase from '../AbstractChannelsDatabase'
import EngineMongo from './EngineMongo'
import * as BigNumber from 'bignumber.js'
import pify from '../../util/pify'
import IChannelsDatabase from '../IChannelsDatabase'
import ChannelId from '../../ChannelId'
import { PaymentChannel } from '../../PaymentChannel'

export default class MongoChannelsDatabase extends AbstractChannelsDatabase<EngineMongo> implements IChannelsDatabase {
  async save (paymentChannel: PaymentChannel): Promise<void> {
    await this.engine.exec(client => {
      const document = {
        kind: this.kind,
        sender: paymentChannel.sender,
        receiver: paymentChannel.receiver,
        value: paymentChannel.value.toString(),
        spent: paymentChannel.spent.toString(),
        channelId: paymentChannel.channelId,
        state: paymentChannel.state,
        contractAddress: paymentChannel.contractAddress
      }

      return pify((cb: (err: Error) => void) => client.collection('channel').insertOne(document, cb))
    })
  }

  firstById (channelId: ChannelId | string): Promise<PaymentChannel | null> {
    return this.engine.exec((client: any) => {
      const query = {
        kind: this.kind,
        channelId: channelId.toString()
      }

      return pify((cb: Function) => client.collection('channel').findOne(query, cb))
    }).then((doc: any) => {
      if (!doc) {
        return null
      }

      return this.inflatePaymentChannel(doc)
    })
  }

  /**
   * Set amount of money spent on the channel.
   */
  async spend (channelId: ChannelId | string, spent: BigNumber.BigNumber): Promise<void> {
    await this.engine.exec(client => {
      const query = {
        kind: this.kind,
        channelId: channelId.toString()
      }

      const update = {
        $set: {
          spent: spent.toString()
        }
      }

      return pify((cb: (err: Error) => void) => client.collection('channel').updateOne(query, update, {}, cb))
    })
  }

  async deposit (channelId: ChannelId | string, value: BigNumber.BigNumber): Promise<void> {
    await this.engine.exec(async client => {
      const channel = await this.firstById(channelId)

      if (!channel) {
        throw new Error('Channel not found.')
      }

      const query = {
        kind: this.kind,
        channelId: channelId.toString()
      }

      const newValue = channel.value.add(value)

      const update = {
        $set: {
          value: newValue.toString()
        }
      }

      return pify<void>((cb: (err: Error) => void) => {
        client.collection('channel').updateOne(query, update, {}, cb)
      })
    })
  }

  /**
   * Retrieve all the payment channels stored.
   *
   * @return {Promise<PaymentChannel>}
   */
  all (): Promise<Array<PaymentChannel>> {
    return this.engine.exec((client: any) => {
      return pify((cb: Function) => client.collection('channel').find({}).toArray(cb))
    }).then((res: any) => this.inflatePaymentChannels(res))
  }

  allOpen (): Promise<PaymentChannel[]> {
    return this.engine.exec((client: any) => {
      return pify((cb: Function) => client.collection('channel').find({ state: 0 }).toArray(cb))
    }).then((res: any) => this.inflatePaymentChannels(res))
      .then((chans: PaymentChannel[]) => this.filterByState(0, chans))
  }

  findUsable (sender: string, receiver: string, amount: BigNumber.BigNumber): Promise<PaymentChannel | null> {
    return this.engine.exec((client: any) => {
      const query = {
        sender,
        receiver,
        state: 0
      }
      return pify((cb: Function) => client.collection('channel').find(query).toArray(cb))
    }).then((res: any) => this.inflatePaymentChannels(res))
      .then((channels: PaymentChannel[]) => this.filterByState(0, channels))
      .then((res: Array<PaymentChannel>) => {
        return res.find((chan: PaymentChannel) => chan.value.greaterThanOrEqualTo(chan.spent.add(amount))) || null
      })
  }

  findBySenderReceiver (sender: string, receiver: string): Promise<Array<PaymentChannel>> {
    return this.engine.exec((client: any) => {
      return pify((cb: Function) => client.collection('channel').find({ sender, receiver }).toArray(cb))
    }).then((res: any) => this.inflatePaymentChannels(res))
  }

  findBySenderReceiverChannelId (sender: string, receiver: string, channelId: ChannelId | string): Promise<PaymentChannel | null> {
    return this.engine.exec((client: any) => {
      return pify((cb: Function) => client.collection('channel').find({
        sender,
        receiver,
        channelId: channelId.toString()
      }).toArray(cb))
    }).then((res: any) => this.inflatePaymentChannel(res[0]))
  }

  async updateState (channelId: ChannelId | string, state: number): Promise<void> {
    await this.engine.exec((client: any) => {
      const query = {
        kind: this.kind,
        channelId: channelId.toString()
      }

      const update = {
        $set: {
          state
        }
      }

      return pify((cb: Function) => client.collection('channel').update(query, update, {}, cb))
    })
  }
}
