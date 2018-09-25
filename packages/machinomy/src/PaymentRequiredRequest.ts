import { InvalidUrlError } from './Exceptions'
import { parse } from 'url'
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

  deserialize (urlString: string): PaymentRequiredRequest {
    const url = parse(urlString)
    if (!url.query) {
      throw new InvalidUrlError()
    }
    const params: any = url.query.split('&').reduce((acc, hash) => {
      const [key, val] = hash.split('=')
      return Object.assign(acc, { [key]: decodeURIComponent(val) })
    }, {})
    const sender = params.sender
    if (!sender) {
      throw new InvalidUrlError()
    }
    let datetime: number | undefined = params.datetime
    if (datetime) {
      datetime = Number(datetime)
    }
    if (datetime && isNaN(datetime)) {
      datetime = undefined
    }
    return {
      sender: sender,
      datetime: datetime
    }
  }
}
