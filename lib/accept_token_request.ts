import Serde from './serde'

export class AcceptTokenRequest {
  token: string

  constructor (token: string) {
    this.token = token
  }
}

export class AcceptTokenRequestSerde implements Serde<AcceptTokenRequest> {
  static instance: AcceptTokenRequestSerde = new AcceptTokenRequestSerde()

  serialize (obj: AcceptTokenRequest): object {
    return {
      token: obj.token
    }
  }

  deserialize (data: any): AcceptTokenRequest {
    if (!data.token) {
      throw new Error('Cannot deserialize token request. Token is missing.')
    }

    return new AcceptTokenRequest(data.token)
  }
}
