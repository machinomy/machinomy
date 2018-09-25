import { PaymentRequiredResponseSerializer, TRANSPORT_VERSION } from './PaymentRequiredResponse'
import * as BigNumber from 'bignumber.js'
import { TransportVersionNotSupportError } from './Exceptions';
import Signature from './Signature';
const expect = require('expect')

describe('PaymentRequiredResponse', () => {
  describe('deserialize', () => {
    it('success', () => {
      const response = PaymentRequiredResponseSerializer.instance.deserialize({
        'paywall-version': TRANSPORT_VERSION,
        'paywall-address': '0x1234',
        'paywall-price': '1000',
        'paywall-gateway': 'http://honkhost:8080/machinomy',
        'paywall-meta': 'hello',
        'paywall-token-contract': '0xbeef',
        'paywall-channels': '[{"channelId": "0x111", "spent": "10", "lastPayment": "11", "sign": "0xbabe"}]'
      })

      expect(response.receiver).toBe('0x1234')
      expect(response.price).toEqual(new BigNumber.BigNumber(1000))
      expect(response.gateway).toBe('http://honkhost:8080/machinomy')
      expect(response.meta).toBe('hello')
      expect(response.tokenContract).toBe('0xbeef')
      expect(response.remoteChannelInfo.channels.length).toBe(1)
      expect(response.remoteChannelInfo.channels[0].channelId).toBe('0x111')
      expect(response.remoteChannelInfo.channels[0].spent).toEqual(new BigNumber.BigNumber(10))
      expect(response.remoteChannelInfo.channels[0].lastPayment).toEqual(new BigNumber.BigNumber(11))
      expect(response.remoteChannelInfo.channels[0].sign).toEqual(Signature.fromRpcSig('0xbabe'))
    })

    it('wrongversion', () => {
      try {
        PaymentRequiredResponseSerializer.instance.deserialize({
          'paywall-version': '',
          'paywall-address': '0x1234',
          'paywall-price': '1000',
          'paywall-gateway': 'http://honkhost:8080/machinomy',
          'paywall-meta': 'hello',
          'paywall-token-contract': '0xbeef',
          'paywall-channels': '[{"channelId": "0x111", "spent": "10", "lastPayment": "11", "sign": "0xbabe"}]'
        })
      } catch (err) {
        expect(err instanceof TransportVersionNotSupportError).toBe(true)
        return
      }
      expect(false, true) // We must return in catch
    })
  })
})
