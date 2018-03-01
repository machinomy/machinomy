import { ChannelId, PaymentChannel, PaymentChannelJSON } from '../channel'
import Engine, { EngineMongo, EngineNedb, EnginePostgres } from '../engines/engine'
import * as BigNumber from 'bignumber.js'
import { namespaced } from '../util/namespaced'
import pify from '../util/pify'
import log from '../util/log'
import ChannelContract from '../channel_contract'

export default interface ChannelsDatabase {
  save (paymentChannel: PaymentChannel): Promise<void>

  saveOrUpdate (paymentChannel: PaymentChannel): Promise<void>

  firstById (channelId: ChannelId | string): Promise<PaymentChannel | null>

  spend (channelId: ChannelId | string, spent: BigNumber.BigNumber): Promise<void>

  all (): Promise<Array<PaymentChannel>>

  allOpen (): Promise<PaymentChannel[]>

  findUsable (sender: string, receiver: string, amount: BigNumber.BigNumber): Promise<PaymentChannel | null>

  findBySenderReceiver (sender: string, receiver: string): Promise<Array<PaymentChannel>>

  findBySenderReceiverChannelId (sender: string, receiver: string, channelId: ChannelId | string): Promise<PaymentChannel | null>

  updateState (channelId: ChannelId | string, state: number): Promise<void>
}

const LOG = log('AbstractChannelsDatabase')

export abstract class AbstractChannelsDatabase<T extends Engine> implements ChannelsDatabase {
  engine: T

  kind: string

  contract: ChannelContract

  constructor (engine: T, channelContract: ChannelContract, namespace: string | null) {
    this.kind = namespaced(namespace, 'channel')
    this.engine = engine
    this.contract = channelContract
  }

  inflatePaymentChannels (channels: Array<PaymentChannelJSON>): Promise<Array<PaymentChannel>> {
    if (!channels.length) {
      return Promise.resolve([])
    }

    // There shouldn't be any nulls here.
    return Promise.all(channels.map((chan: PaymentChannelJSON) => this.inflatePaymentChannel(chan))) as Promise<Array<PaymentChannel>>
  }

  inflatePaymentChannel (json: PaymentChannelJSON): Promise<PaymentChannel | null> {
    if (!json) {
      return Promise.resolve(null)
    }

    const doc = PaymentChannel.fromDocument(json)
    return this.contract.getState(json.channelId).then((state: any) => new PaymentChannel(
      doc.sender,
      doc.receiver,
      doc.channelId,
      doc.value,
      doc.spent,
      state === -1 ? 2 : state,
      doc.contractAddress || undefined
    ))
  }

  filterByState (state: number, channels: PaymentChannel[]): PaymentChannel[] {
    return channels.filter((chan: PaymentChannel) => chan.state === state)
  }

  abstract save (paymentChannel: PaymentChannel): Promise<void>

  saveOrUpdate (paymentChannel: PaymentChannel): Promise<void> {
    LOG(`Saving or updating channel with ID ${paymentChannel.channelId.toString()}`)

    return this.firstById(paymentChannel.channelId).then((found: PaymentChannel) => {
      if (found) {
        LOG(`Spending channel with ID ${paymentChannel.channelId.toString()}`)
        return this.spend(paymentChannel.channelId, paymentChannel.spent)
      } else {
        LOG(`Spending channel with ID ${paymentChannel.channelId.toString()}`)
        return this.save(paymentChannel)
      }
    })
  }

  abstract firstById (channelId: ChannelId | string): Promise<PaymentChannel | null>

  abstract spend (channelId: ChannelId | string, spent: BigNumber.BigNumber): Promise<void>

  abstract all (): Promise<Array<PaymentChannel>>

  abstract allOpen (): Promise<PaymentChannel[]>

  abstract findUsable (sender: string, receiver: string, amount: BigNumber.BigNumber): Promise<PaymentChannel | null>

  abstract findBySenderReceiver (sender: string, receiver: string): Promise<Array<PaymentChannel>>

  abstract findBySenderReceiverChannelId (sender: string, receiver: string, channelId: ChannelId | string): Promise<PaymentChannel | null>

  abstract updateState (channelId: ChannelId | string, state: number): Promise<void>
}

/**
 * Database layer for {PaymentChannel}
 */
export class NedbChannelsDatabase extends AbstractChannelsDatabase<EngineNedb> implements ChannelsDatabase {
  save (paymentChannel: PaymentChannel): Promise<void> {
    return this.engine.exec((client: any) => {
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

      return pify((cb: Function) => client.insert(document, cb))
    })
  }

  firstById (channelId: ChannelId | string): Promise<PaymentChannel | null> {
    return this.engine.exec((client: any) => {
      const query = {
        kind: this.kind,
        channelId: channelId.toString()
      }

      return pify((cb: Function) => client.find(query, cb))
    }).then((doc: any) => this.inflatePaymentChannel(doc[0]))
  }

  /**
   * Set amount of money spent on the channel.
   */
  spend (channelId: ChannelId | string, spent: BigNumber.BigNumber): Promise<void> {
    return this.engine.exec((client: any) => {
      const query = {
        kind: this.kind,
        channelId: channelId.toString()
      }

      const update = {
        $set: {
          spent: spent.toString()
        }
      }

      return pify((cb: Function) => client.update(query, update, {}, cb))
    })
  }

  /**
   * Retrieve all the payment channels stored.
   *
   * @return {Promise<PaymentChannel>}
   */
  all (): Promise<Array<PaymentChannel>> {
    return this.engine.exec((client: any) => {
      return pify((cb: Function) => client.find({ kind: this.kind }, cb))
    }).then((res) => this.inflatePaymentChannels(res))
  }

  allOpen (): Promise<PaymentChannel[]> {
    return this.engine.exec((client: any) => {
      return pify((cb: Function) => client.find({ kind: this.kind, state: 0 }, cb))
    }).then((res) => this.inflatePaymentChannels(res))
      .then((chans: PaymentChannel[]) => this.filterByState(0, chans))
  }

  findUsable (sender: string, receiver: string, amount: BigNumber.BigNumber): Promise<PaymentChannel | null> {
    return this.engine.exec((client: any) => {
      const query = {
        kind: this.kind,
        state: 0,
        sender,
        receiver
      }
      return pify((cb: Function) => client.find(query, cb))
    }).then((res) => this.inflatePaymentChannels(res))
      .then((channels: PaymentChannel[]) => this.filterByState(0, channels))
      .then((res: Array<PaymentChannel>) => {
        return res.find((chan: PaymentChannel) => chan.value.greaterThanOrEqualTo(chan.spent.add(amount))) || null
      })
  }

  findBySenderReceiver (sender: string, receiver: string): Promise<Array<PaymentChannel>> {
    return this.engine.exec((client: any) => {
      return pify((cb: Function) => client.find({ sender, receiver, kind: this.kind }, cb))
    }).then((res) => this.inflatePaymentChannels(res))
  }

  findBySenderReceiverChannelId (sender: string, receiver: string, channelId: ChannelId | string): Promise<PaymentChannel | null> {
    return this.engine.exec((client: any) => {
      return pify((cb: Function) => client.find({
        sender,
        receiver,
        channelId: channelId.toString(),
        kind: this.kind
      }, cb))
    }).then((res) => this.inflatePaymentChannel(res[0]))
  }

  updateState (channelId: ChannelId | string, state: number): Promise<void> {
    return this.engine.exec((client: any) => {
      const query = {
        kind: this.kind,
        channelId: channelId.toString()
      }

      const update = {
        $set: {
          state
        }
      }

      return pify((cb: Function) => client.update(query, update, {}, cb))
    })
  }
}

export class MongoChannelsDatabase extends AbstractChannelsDatabase<EngineMongo> implements ChannelsDatabase {
  save (paymentChannel: PaymentChannel): Promise<void> {
    return this.engine.exec((client: any) => {
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

      return pify((cb: Function) => client.collection('channel').insert(document, cb))
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
  spend (channelId: ChannelId | string, spent: BigNumber.BigNumber): Promise<void> {
    return this.engine.exec((client: any) => {
      const query = {
        kind: this.kind,
        channelId: channelId.toString()
      }

      const update = {
        $set: {
          spent: spent.toString()
        }
      }

      return pify((cb: Function) => client.collection('channel').update(query, update, {}, cb))
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

  updateState (channelId: ChannelId | string, state: number): Promise<void> {
    return this.engine.exec((client: any) => {
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

export class PostgresChannelsDatabase extends AbstractChannelsDatabase<EnginePostgres> {
  save (paymentChannel: PaymentChannel): Promise<void> {
    return this.engine.exec((client: any) => client.query(
      'INSERT INTO channel("channelId", kind, sender, receiver, value, spent, state, "contractAddress") ' +
      'VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [
        paymentChannel.channelId,
        this.kind,
        paymentChannel.sender,
        paymentChannel.receiver,
        paymentChannel.value.toString(),
        paymentChannel.spent.toString(),
        paymentChannel.state,
        paymentChannel.contractAddress
      ]
    ))
  }

  firstById (channelId: ChannelId | string): Promise<PaymentChannel | null> {
    return this.engine.exec((client: any) => client.query(
      'SELECT "channelId", kind, sender, receiver, value, spent, state, "contractAddress" FROM channel ' +
      'WHERE "channelId" = $1 LIMIT 1',
      [
        channelId.toString()
      ]
    )).then((res: any) => this.inflatePaymentChannel(res.rows[0]))
  }

  spend (channelId: ChannelId | string, spent: BigNumber.BigNumber): Promise<void> {
    return this.engine.exec((client: any) => client.query(
      'UPDATE channel SET spent = $2 WHERE "channelId" = $1',
      [
        channelId.toString(),
        spent.toString()
      ]
    ))
  }

  all (): Promise<Array<PaymentChannel>> {
    return this.engine.exec((client: any) => client.query(
      'SELECT "channelId", kind, sender, receiver, value, spent, state, "contractAddress" FROM channel'
    )).then((res: any) => this.inflatePaymentChannels(res.rows))
  }

  allOpen (): Promise<PaymentChannel[]> {
    return this.engine.exec((client: any) => client.query(
      'SELECT "channelId", kind, sender, receiver, value, spent, state, "contractAddress" FROM channel ' +
      'WHERE state = 0'
    )).then((res: any) => this.inflatePaymentChannels(res.rows))
      .then((chans: PaymentChannel[]) => this.filterByState(0, chans))
  }

  findUsable (sender: string, receiver: string, amount: BigNumber.BigNumber): Promise<PaymentChannel | null> {
    return this.engine.exec((client: any) => client.query(
      'SELECT "channelId", kind, sender, receiver, value, spent, state, "contractAddress" FROM channel ' +
      'WHERE sender = $1 AND receiver = $2 AND value >= spent + $3 AND state = 0',
      [
        sender,
        receiver,
        amount.toString()
      ]
    )).then((res: any) => this.inflatePaymentChannel(res.rows[0]))
      .then((channel: PaymentChannel) => this.filterByState(0, [channel])[0] || null)
  }

  findBySenderReceiver (sender: string, receiver: string): Promise<Array<PaymentChannel>> {
    return this.engine.exec((client: any) => client.query(
      'SELECT "channelId", kind, sender, receiver, value, spent, state, "contractAddress" FROM channel ' +
      'WHERE sender = $1 AND receiver = $2',
      [
        sender,
        receiver
      ]
    )).then((res: any) => this.inflatePaymentChannels(res.rows))
  }

  findBySenderReceiverChannelId (sender: string, receiver: string, channelId: ChannelId | string): Promise<PaymentChannel | null> {
    return this.engine.exec((client: any) => client.query(
      'SELECT "channelId", kind, sender, receiver, value, spent, state, "contractAddress" FROM channel ' +
      'WHERE sender = $1 AND receiver = $2 AND "channelId" = $3 LIMIT 1',
      [
        sender,
        receiver,
        channelId.toString()
      ]
    )).then((res: any) => this.inflatePaymentChannel(res.rows[0]))
  }

  updateState (channelId: ChannelId | string, state: number): Promise<void> {
    return this.engine.exec((client: any) => client.query(
      'UPDATE channel SET state = $1 WHERE "channelId" = $2',
      [
        state,
        channelId.toString()
      ]
    ))
  }
}
