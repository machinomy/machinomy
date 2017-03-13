'use strict'

const tmp = require('tmp')
const Promise = require('bluebird')
const Web3 = require('web3')
const FakeProvider = require('web3-fake-provider')
const ProviderEngine = require('web3-provider-engine')

const mocha = require('mocha')

const channel = require('../lib/channel')

/**
 * Return Web3 uses FakeProvider.
 *
 * @return {Web3}
 */
const fakeWeb3 = () => {
  let engine = new ProviderEngine()
  let provider = new FakeProvider()
  let web3 = new Web3(engine)
  web3.setProvider(provider)
  return web3
}

const tmpFileName = Promise.promisify(tmp.tmpName)

/**
 * @return {number}
 */
const randomInteger = () => {
  return Math.floor(Math.random() * 10000)
}

const randomChannelId = () => {
  return channel.id(Buffer.from(randomInteger().toString()))
}

module.exports = {
  fakeWeb3: fakeWeb3,
  it: mocha.it,
  describe: mocha.describe,
  tmpFileName: tmpFileName,
  randomInteger: randomInteger,
  randomChannelId: randomChannelId
}
