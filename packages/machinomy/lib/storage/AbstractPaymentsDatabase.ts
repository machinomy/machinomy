import Payment, { PaymentJSON, PaymentSerde } from '../payment'
import { namespaced } from '../util/namespaced'
import IEngine from './IEngine'
import IPaymentsDatabase from './IPaymentsDatabase'
import ChannelId from '../ChannelId'

export default abstract class AbstractPaymentsDatabase<T extends IEngine> implements IPaymentsDatabase {
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
