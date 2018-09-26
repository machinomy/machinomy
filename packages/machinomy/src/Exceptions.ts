export class PaymentNotValidError extends Error {
  constructor () {
    super('Invalid payment.')
  }
}

export class TransportVersionNotSupportError extends Error {
  constructor () {
    super('Transport version not supported')
  }
}

export class InvalidUrlError extends Error {
  constructor () {
    super('Invalid url')
  }
}

export class BadResponseError extends Error {
  constructor () {
    super('Received bad response from content server.')
  }
}

export class IvalidTypeError extends Error {
  constructor (typeName: string, properyName: string) {
    super(`Object is not ${typeName}: expected ${properyName}`)
  }
}

export class InvalidChannelError extends Error {
  constructor (fieldName: string) {
    super(`Channel is not valid or not owned: wrong field ${fieldName}`)
  }
}
