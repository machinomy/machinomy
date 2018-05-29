import Serde from './Serde'

export class AcceptPaymentResponse {
  token: string

  constructor (token: string) {
    this.token = token
  }
}

export class AcceptPaymentResponseSerde implements Serde<AcceptPaymentResponse> {
  static instance: AcceptPaymentResponseSerde = new AcceptPaymentResponseSerde()

  serialize (obj: AcceptPaymentResponse): object {
    return {
      token: obj.token
    }
  }

  deserialize (data: any): AcceptPaymentResponse {
    if (!data.token) {
      throw new Error('Cannot deserialize payment response. Token is missing.')
    }

    return new AcceptPaymentResponse(data.token)
  }
}
