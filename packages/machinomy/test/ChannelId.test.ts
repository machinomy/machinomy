import ChannelId from '../lib/ChannelId'
import * as expect from 'expect'
import { Buffer } from 'safe-buffer'

const HEX_ADDRESS = 'eb61859a9d74f95bda8a6f9d3efcfe6478e49151'

describe('ChannelId', () => {
  describe('.build', () => {
    const buffer = Buffer.from(HEX_ADDRESS, 'hex')
    const expected = new ChannelId(buffer)
    it('from non-prefixed hex', () => {
      let channelId = ChannelId.build(HEX_ADDRESS)
      expect(channelId).toEqual(expected)
    })
    it('from prefixed hex', () => {
      let channelId = ChannelId.build('0x' + HEX_ADDRESS)
      expect(channelId).toEqual(expected)
    })
    it('from Buffer', () => {
      let channelId = ChannelId.build(buffer)
      expect(channelId).toEqual(expected)
    })
    it('from ChannelId', () => {
      let channelId = ChannelId.build(expected)
      expect(channelId).toEqual(expected)
    })
  })

  describe('#toString', () => {
    it('return prefixed hex', () => {
      let channelId = ChannelId.build(HEX_ADDRESS)
      let actual = channelId.toString()
      expect(actual).toEqual('0x' + HEX_ADDRESS)
    })
  })
})
