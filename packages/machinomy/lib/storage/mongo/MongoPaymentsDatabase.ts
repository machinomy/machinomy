import EngineMongo from './EngineMongo'
import pify from '../../util/pify'
import Payment, { PaymentSerde } from '../../payment'
import AbstractPaymentsDatabase from '../AbstractPaymentsDatabase'
import ChannelId from '../../ChannelId'

export default class MongoPaymentsDatabase extends AbstractPaymentsDatabase<EngineMongo> {
  /**
   * Save payment to the database, to check later.
   */
  async save (token: string, payment: Payment): Promise<void> {
    const serialized: any = PaymentSerde.instance.serialize(payment)
    serialized.kind = this.kind
    serialized.token = token
    serialized.createdAt = Date.now()
    // log.info(`Saving payment for channel ${payment.channelId} and token ${token}`)

    await this.engine.exec(client => {
      return pify((cb: (err: Error) => void) => client.collection('payment').insertOne(serialized, cb))
    })
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
