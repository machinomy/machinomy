import * as tmp from 'tmp'
import * as BigNumber from 'bignumber.js'

export function tmpFileName (): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    tmp.tmpName((err, path) => {
      err ? reject(err) : resolve(path)
    })
  })
}

export function randomInteger (): number {
  return Math.floor(Math.random() * 10000)
}

export function randomBigNumber (): BigNumber.BigNumber {
  return new BigNumber.BigNumber(Math.floor(Math.random() * 10000))
}
