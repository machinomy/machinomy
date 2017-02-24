'use strict'

const tmp = require('tmp')
const assert = require('assert')
const mocha = require('mocha')
const Promise = require('bluebird')

const channel = require('../lib/channel')

const describe = mocha.describe
const it = mocha.it

describe('channel', () => {
  describe('.id', () => {
    const hex = 'eb61859a9d74f95bda8a6f9d3efcfe6478e49151'
    const buffer = Buffer.from(hex, 'hex')
    const expected = new channel.ChannelId(buffer)
    it('builds ChannelId from non-prefixed hex', () => {
      let channelId = channel.id(hex)
      assert.deepEqual(channelId, expected)
    })
    it('builds ChannelId from prefixed hex', () => {
      let channelId = channel.id('0x' + hex)
      assert.deepEqual(channelId, expected)
    })
    it('builds ChannelId from Buffer', () => {
      let channelId = channel.id(buffer)
      assert.deepEqual(channelId, expected)
    })
    it('builds ChannelId from ChannelId', () => {
      let channelId = channel.id(expected)
      assert.deepEqual(channelId, expected)
    })
  })
})
