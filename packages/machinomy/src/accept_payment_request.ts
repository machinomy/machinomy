import Serde from './Serde'
import { default as Payment, PaymentSerde } from './payment'
import { HasTypeField } from './has_type_field'

export class AcceptPaymentRequest {
  payment: Payment

  purchaseMeta: HasTypeField

  constructor (payment: Payment, purchaseMeta: HasTypeField) {
    this.payment = payment
    this.purchaseMeta = purchaseMeta
  }
}

export class AcceptPaymentRequestSerde implements Serde<AcceptPaymentRequest> {
  static instance: AcceptPaymentRequestSerde = new AcceptPaymentRequestSerde()

  serialize (obj: AcceptPaymentRequest): object {
    return {
      payment: PaymentSerde.instance.serialize(obj.payment),
      purchaseMeta: obj.purchaseMeta
    }
  }

  deserialize (data: any): AcceptPaymentRequest {
    if (!data.payment) {
      throw new Error('Cannot deserialize payment request. Payment is missing.')
    }

    if (data.purchaseMeta && !data.purchaseMeta.type) {
      throw new Error('Purchase meta requires a type field.')
    }

    return {
      payment: PaymentSerde.instance.deserialize(data.payment),
      purchaseMeta: data.purchaseMeta
    }
  }
}
