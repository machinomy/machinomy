import { InvalidUrl } from './Exceptions'

export class PaymentRequiredRequest {
  datetime?: number
  constructor (datetime?: number) {
    this.datetime = datetime
  }
}

export class PaymentRequiredRequestSerializer {
  static instance: PaymentRequiredRequestSerializer = new PaymentRequiredRequestSerializer()

  serialize (obj: PaymentRequiredRequest, baseurl: string): string {
    const url = `${baseurl}${obj.datetime ? `/${obj.datetime}` : ''}`
    return url
  }

  deserialize (url: string, baseurl: string): PaymentRequiredRequest {
    if (url.length < baseurl.length) {
      throw new InvalidUrl()
    }
    const index = url.indexOf(baseurl)

    if (index < 0) {
      throw new InvalidUrl()
    }
    const uri = url.substring(index + baseurl.length)
    const parts = uri.split('/')
    return {
      datetime: parts.length >= 1 ? Number(parts[0]) : undefined
    }
  }
}
