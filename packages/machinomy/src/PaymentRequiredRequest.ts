import { InvalidUrlError } from './Exceptions'
import { URLSearchParams } from 'url'

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
    const url = `${baseurl}?sender=${obj.sender}${obj.datetime ? `&timestamp=${obj.datetime}` : ''}`
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
    const searchParams = new URLSearchParams(url)
    const sender = searchParams.get('sender')
    if (!sender) {
      throw new InvalidUrlError()
    }
    const datetime = searchParams.get('datetime')
    return {
      sender: sender,
      datetime: datetime ? Number(datetime) : undefined
    }
  }
}
