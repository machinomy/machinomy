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
        'paywall-token-contract': '0xbeef'
      })

      expect(response.receiver).toBe('0x1234')
      expect(response.price).toEqual(new BigNumber.BigNumber(1000))
      expect(response.gateway).toBe('http://honkhost:8080/machinomy')
      expect(response.meta).toBe('hello')
      expect(response.tokenContract).toBe('0xbeef')
    })

    it('wrongversion', () => {
      try {
        PaymentRequiredResponseSerializer.instance.deserialize({
          'paywall-version': '',
          'paywall-address': '0x1234',
          'paywall-price': '1000',
          'paywall-gateway': 'http://honkhost:8080/machinomy',
          'paywall-meta': 'hello',
          'paywall-token-contract': '0xbeef'
        })
      } catch (err) {
        expect(err instanceof TransportVersionNotSupportError).toBe(true)
        return
      }
      expect(false, true) // We must return in catch
    })
  })
})
