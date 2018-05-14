import Serde from './Serde'

export class AcceptTokenResponse {
  status: boolean

  constructor (status: boolean) {
    this.status = status
  }
}

export class AcceptTokenResponseSerde implements Serde<AcceptTokenResponse> {
  static instance: AcceptTokenResponseSerde = new AcceptTokenResponseSerde()

  serialize (obj: AcceptTokenResponse): object {
    return {
      status: obj.status
    }
  }

  deserialize (data: any): AcceptTokenResponse {
    if (data.status === undefined) {
      throw new Error('Cannot deserialize token response. Status is missing.')
    }

    return new AcceptTokenResponse(data.status)
  }
}
