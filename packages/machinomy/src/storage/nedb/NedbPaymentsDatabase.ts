import pify from '../../util/pify'
import Payment, { PaymentJSON, PaymentSerde } from '../../payment'
import AbstractPaymentsDatabase from '../AbstractPaymentsDatabase'
import EngineNedb from './EngineNedb'
import ChannelId from '../../ChannelId'

export default class NedbPaymentsDatabase extends AbstractPaymentsDatabase<EngineNedb> {
  async save (token: string, payment: Payment): Promise<void> {
    const serialized: any = PaymentSerde.instance.serialize(payment)
    serialized.kind = this.kind
    serialized.token = token
    serialized.createdAt = Date.now()
    // log.info(`Saving payment for channel ${payment.channelId} and token ${token}`)

    await this.engine.exec(client => client.insert(serialized))
  }

  /**
   * Find a payment with maximum value on it inside the channel.
   */
  async firstMaximum (channelId: ChannelId | string): Promise<Payment | null> {
    // log.info(`Trying to find last payment for channel ${channelId.toString()}`)
    let query = { kind: this.kind, channelId: channelId.toString() }
    let raw = await this.engine.exec(client => {
      return pify<Array<PaymentJSON>>((cb: (error: Error, documents: Array<PaymentJSON>) => void) => {
        client.datastore.find<PaymentJSON>(query).sort({ value: -1 }).limit(1).exec(cb)
      })
    })
    return this.inflatePayment(raw[0])
  }

  /**
   * Find a payment by token.
   */
  async findByToken (token: string): Promise<Payment | null> {
    let query = { kind: this.kind, token: token }
    let raw = await this.engine.exec(client => {
      return client.findOne<PaymentJSON>(query)
    })
    return this.inflatePayment(raw)
  }
}
