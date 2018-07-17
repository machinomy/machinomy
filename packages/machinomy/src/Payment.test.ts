import ChannelId from './ChannelId'
import * as support from './support'
import Payment from './payment'
import Signature from './Signature'
import { PaymentChannel } from './PaymentChannel'
import * as expect from 'expect'

describe('Payment', () => {
  describe('.fromPaymentChannel', () => {
    it('build Payment object', () => {
      let channelId = ChannelId.random()
      let payment = new Payment({
        channelId: channelId.toString(),
        sender: 'sender',
        receiver: 'receiver',
        price: support.randomBigNumber(),
        value: support.randomBigNumber(),
        channelValue: support.randomBigNumber(),
        meta: 'metaexample',
        signature: Signature.fromParts({
          v: 27,
          r: '0x2',
          s: '0x3'
        }),
        token: undefined,
        tokenContract: ''
      })
      let paymentChannel = PaymentChannel.fromPayment(payment)
      expect(paymentChannel.channelId).toBe(payment.channelId)
      expect(paymentChannel.sender).toBe(payment.sender)
      expect(paymentChannel.receiver).toBe(payment.receiver)
      expect(paymentChannel.value).toEqual(payment.channelValue)
    })
  })
})
