import { ChannelId } from '../channel'
import Payment, { PaymentJSON, PaymentSerde } from '../payment'
import pify from '../util/pify'
import { namespaced } from '../util/namespaced'
import Engine, { EngineMongo, EngineNedb, EnginePostgres } from '../engines/engine'
/* tslint:enable */

export default interface PaymentsDatabase {
  save (token: string, payment: Payment): Promise<void>

  firstMaximum (channelId: ChannelId | string): Promise<Payment | null>

  findByToken (token: string): Promise<Payment | null>
}

export abstract class AbstractPaymentsDatabase<T extends Engine> implements PaymentsDatabase {
  kind: string

  engine: T

  constructor (engine: T, namespace: string | null) {
    this.kind = namespaced(namespace, 'payment')
    this.engine = engine
  }

  inflatePayment (json: PaymentJSON): Payment | null {
    if (!json) {
      return null
    }

    return PaymentSerde.instance.deserialize(json)
  }

  abstract save (token: string, payment: Payment): Promise<void>

  abstract firstMaximum (channelId: ChannelId | string): Promise<Payment | any>

  abstract findByToken (token: string): Promise<Payment | any>
}

/**
 * Database layer for payments.
 */
export class MongoPaymentsDatabase extends AbstractPaymentsDatabase<EngineMongo> {
  /**
   * Save payment to the database, to check later.
   */
  save (token: string, payment: Payment): Promise<void> {
    const serialized: any = PaymentSerde.instance.serialize(payment)
    serialized.kind = this.kind
    serialized.token = token
    // log.info(`Saving payment for channel ${payment.channelId} and token ${token}`)

    return this.engine.exec((client: any) => pify((cb: Function) => client.collection('payment').insert(serialized, cb)))
  }

  /**
   * Find a payment with maximum value on it inside the channel.
   */
  firstMaximum (channelId: ChannelId | string): Promise<Payment | null> {
    // log.info(`Trying to find last payment for channel ${channelId.toString()}`)
    let query = { kind: this.kind, channelId: channelId.toString() }

    return this.engine.exec((client: any) => pify((cb: Function) => client.collection('payment')
      .find(query).sort({ value: -1 }).limit(1).toArray(cb)))
      .then((res: any) => this.inflatePayment(res[0]))
  }

  /**
   * Find a payment by token.
   */
  findByToken (token: string): Promise<Payment | null> {
    let query = { kind: this.kind, token: token }

    return this.engine.exec((client: any) => pify((cb: Function) => client.collection('payment').findOne(query, cb)))
      .then((res: any) => this.inflatePayment(res))
  }
}

export class NedbPaymentsDatabase extends AbstractPaymentsDatabase<EngineNedb> {
  save (token: string, payment: Payment): Promise<void> {
    const serialized: any = PaymentSerde.instance.serialize(payment)
    serialized.kind = this.kind
    serialized.token = token
    // log.info(`Saving payment for channel ${payment.channelId} and token ${token}`)

    return this.engine.exec((client: any) => pify((cb: Function) => client.insert(serialized, cb)))
  }

  /**
   * Find a payment with maximum value on it inside the channel.
   */
  firstMaximum (channelId: ChannelId | string): Promise<Payment | null> {
    // log.info(`Trying to find last payment for channel ${channelId.toString()}`)
    let query = { kind: this.kind, channelId: channelId.toString() }
    return this.engine.exec((client: any) => pify((cb: Function) => client.findOne(query).sort({ value: -1 }).exec(cb)))
      .then((res) => this.inflatePayment(res))
  }

  /**
   * Find a payment by token.
   */
  findByToken (token: string): Promise<Payment | null> {
    let query = { kind: this.kind, token: token }

    return this.engine.exec((client: any) => pify((cb: Function) => client.findOne(query, cb)))
      .then((res) => this.inflatePayment(res))
  }
}

export class PostgresPaymentsDatabase extends AbstractPaymentsDatabase<EnginePostgres> {
  save (token: string, payment: Payment): Promise<void> {
    const serialized: any = PaymentSerde.instance.serialize(payment)
    serialized.kind = this.kind
    serialized.token = token

    return this.engine.exec((client: any) => client.query(
      'INSERT INTO payment("channelId", kind, token, sender, receiver, price, value, ' +
      '"channelValue", v, r, s, meta, "contractAddress") VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
      [
        serialized.channelId,
        serialized.kind,
        serialized.token,
        serialized.sender,
        serialized.receiver,
        serialized.price,
        serialized.value,
        serialized.channelValue,
        serialized.v,
        serialized.r,
        serialized.s,
        serialized.meta,
        serialized.contractAddress
      ]
    ))
  }

  firstMaximum (channelId: ChannelId | string): Promise<Payment | any> {
    return this.engine.exec((client: any) => client.query(
      'SELECT "channelId", kind, token, sender, receiver, price, value, ' +
      '"channelValue", v, r, s, meta, "contractAddress" FROM payment WHERE "channelId" = $1 ' +
      'ORDER BY value DESC',
      [
        channelId.toString()
      ]
    )).then((res: any) => this.inflatePayment(res.rows[0]))
  }

  findByToken (token: string): Promise<Payment | any> {
    return this.engine.exec((client: any) => client.query(
      'SELECT "channelId", kind, token, sender, receiver, price, value, ' +
      '"channelValue", v, r, s, meta, "contractAddress" FROM payment WHERE token = $1',
      [
        token
      ]
    )).then((res: any) => this.inflatePayment(res.rows[0]))
  }
}
