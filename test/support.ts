import * as tmp from 'tmp'
import * as Web3 from 'web3'
import * as FakeProvider from 'web3-fake-provider'
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

export function randomChannelId (): ChannelId {
  return channel.id(Buffer.from(randomInteger().toString()))
}

export function randomStorage (web3: Web3, engineName: string): Promise<Storage> {
  return tmpFileName().then(filename => {
    return new Storage(web3, filename, null, true, engineName)
  })
}
