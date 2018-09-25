import { InvalidUrlError } from './Exceptions'

export class PaymentRequiredRequest {
  sender: string
  datetime?: number
  constructor (sender: string, datetime?: number) {
    this.sender = sender
    this.datetime = datetime
  }
}

export class PaymentRequiredRequestSerializer {
  static instance: PaymentRequiredRequestSerializer = new PaymentRequiredRequestSerializer()

  serialize (obj: PaymentRequiredRequest, baseurl: string): string {
    const url = `${baseurl}/${obj.sender}${obj.datetime ? `/${obj.datetime}` : ''}`
    return url
  }

  deserialize (url: string, baseurl: string): PaymentRequiredRequest {
    if (url.length < baseurl.length) {
      throw new InvalidUrlError()
    }
    const index = url.indexOf(baseurl)

    if (index < 0) {
      throw new InvalidUrlError()
    }
    const uri = url.substring(index + baseurl.length)
    const parts = uri.split('/')
    if (parts.length < 1) {
      throw new InvalidUrlError()
    }
    return {
      sender: parts[0],
      datetime: parts.length >= 2 ? Number(parts[1]) : undefined
    }
  }
}
