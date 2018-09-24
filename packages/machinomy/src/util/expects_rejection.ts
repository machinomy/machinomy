const expect = require('expect')

export function expectsRejectionType<T = Error> (res: Promise<any>, constructor: {new (): T}): Promise<any> {
  return res.then(() => {
    throw new Error('errExpected')
  }).catch((e) => {
    if (e instanceof TypeError) {
      console.error(e)
      throw new Error('Shouldn\'t receive a TypeError.')
    }

    if (e === 'errExpected') {
      throw new Error('An error was expected.')
    }

    expect(e instanceof constructor).toBe(true)
  })
}

export default function expectsRejection (res: Promise<any>): Promise<any> {
  return expectsRejectionType<Error>(res, Error)
}
