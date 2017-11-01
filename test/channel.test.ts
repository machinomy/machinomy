import * as channel from '../lib/channel'
import * as support from './support'
import Payment from '../lib/Payment'
let expect = require('expect')

const HEX_ADDRESS = 'eb61859a9d74f95bda8a6f9d3efcfe6478e49151'

describe('channel', () => {
  describe('.id', () => {
    const buffer = Buffer.from(HEX_ADDRESS, 'hex')
    const expected = new channel.ChannelId(buffer)
    it('build ChannelId from non-prefixed hex', () => {
      let channelId = channel.id(HEX_ADDRESS)
      expect(channelId).toEqual(expected)
    })
    it('build ChannelId from prefixed hex', () => {
      let channelId = channel.id('0x' + HEX_ADDRESS)
      expect(channelId).toEqual(expected)
    })
    it('build ChannelId from Buffer', () => {
      let channelId = channel.id(buffer)
      expect(channelId).toEqual(expected)
    })
    it('build ChannelId from ChannelId', () => {
      let channelId = channel.id(expected)
      expect(channelId).toEqual(expected)
    })
  })

  describe('ChannelId', () => {
    describe('#toString', () => {
      it('return prefixed hex', () => {
        let channelId = channel.id(HEX_ADDRESS)
        let actual = channelId.toString()
        expect(actual).toEqual('0x' + HEX_ADDRESS)
      })
    })
  })

  describe('Payment', () => {
    describe('.fromPaymentChannel', () => {
      it('build Payment object', () => {
        let channelId = channel.id(Buffer.from(support.randomInteger().toString()))
        let payment = new Payment({
          channelId: channelId.toString(),
          sender: 'sender',
          receiver: 'receiver',
          price: support.randomBigNumber(),
          value: support.randomBigNumber(),
          channelValue: support.randomBigNumber(),
          meta: 'metaexample',
          v: 1,
          r: '0x2',
          s: '0x3'
        })
        let paymentChannel = channel.PaymentChannel.fromPayment(payment)
        expect(paymentChannel.channelId).toBe(payment.channelId)
        expect(paymentChannel.sender).toBe(payment.sender)
        expect(paymentChannel.receiver).toBe(payment.receiver)
        expect(paymentChannel.value).toEqual(payment.channelValue)
      })
    })
  })
})
