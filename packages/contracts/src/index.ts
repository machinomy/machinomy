import Unidirectional from './wrappers/Unidirectional'
import TokenUnidirectional from './wrappers/TokenUnidirectional'
import StandardToken from './wrappers/StandardToken'
import TestToken from './wrappers/TestToken'
import * as ethUtil from 'ethereumjs-util'
import Units from './Units'

export {
  Unidirectional,
  TokenUnidirectional,
  StandardToken,
  TestToken,
  Units
}

export function randomId (digits: number = 3) {
  const datePart = new Date().getTime() * Math.pow(10, digits)
  const extraPart = Math.floor(Math.random() * Math.pow(10, digits)) // 3 random digits
  return datePart + extraPart // 16 digits
}

export function channelId (sender: string, receiver: string): string {
  let random = randomId()
  let buffer = ethUtil.sha3(sender + receiver + random)
  return ethUtil.bufferToHex(buffer)
}
