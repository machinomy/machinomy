'use strict'

const tmp = require('tmp')
const assert = require('assert')
const mocha = require('mocha')
const Promise = require('bluebird')

const channel = require('../lib/channel')

const describe = mocha.describe
const it = mocha.it

const HEX_ADDRESS = 'eb61859a9d74f95bda8a6f9d3efcfe6478e49151'

describe('channel', () => {
  describe('.id', () => {
    const buffer = Buffer.from(HEX_ADDRESS, 'hex')
    const expected = new channel.ChannelId(buffer)
    it('builds ChannelId from non-prefixed hex', () => {
      let channelId = channel.id(HEX_ADDRESS)
      assert.deepEqual(channelId, expected)
    })
    it('builds ChannelId from prefixed hex', () => {
      let channelId = channel.id('0x' + HEX_ADDRESS)
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

  describe('ChannelId', () => {
    describe('#toString', () => {
      it('returns prefixed hex', () => {
        let channelId = channel.id(HEX_ADDRESS)
        let actual = channelId.toString()
        assert.equal(actual, '0x' + HEX_ADDRESS)
      })
    })
  })
})
