export class PaymentNotValid extends Error {
  constructor () {
    super('Invalid payment.')
  }
}

export class TransportVersionNotSupportError extends Error {
  constructor () {
    super('Transport version not supported')
  }
}

export class InvalidUrl extends Error {
  constructor () {
    super('Invalid url')
  }
}

export class BadResponse extends Error {
  constructor () {
    super('Received bad response from content server.')
  }
}
