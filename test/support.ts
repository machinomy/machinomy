import * as tmp from 'tmp'
import Promise = require('bluebird')
import Web3 = require('web3')
import FakeProvider = require('web3-fake-provider')
import { ChannelId } from '../lib/channel'
import Storage from '../lib/storage'
import * as BigNumber from 'bignumber.js'

const channel = require('../lib/channel')

/**
 * Return Web3 uses FakeProvider.
 */
export function fakeWeb3 (): Web3 {
  let provider = new FakeProvider()
  let web3 = new Web3()
  web3.setProvider(provider)
  return web3
}

export const tmpFileName: () => Promise<string> = Promise.promisify(tmp.tmpName)

export function randomInteger (): number {
  return Math.floor(Math.random() * 10000)
}

export function randomBigNumber (): BigNumber.BigNumber {
  return new BigNumber.BigNumber(Math.floor(Math.random() * 10000))
}

export function randomChannelId (): ChannelId {
  return channel.id(Buffer.from(randomInteger().toString()))
}

export function randomStorage (web3: Web3, engineName: string): Promise<Storage> {
  return tmpFileName().then(filename => {
    return new Storage(web3, filename, null, true, engineName)
  })
}
