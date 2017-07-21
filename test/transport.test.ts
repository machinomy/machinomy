import nock = require('nock')
import * as channel from '../lib/channel'
import * as transport from '../lib/transport'
import { randomInteger } from './support'

describe('transport', () => {
  describe('.build', () => {
    it('return Transport instance', () => {
      let t = transport.build()
      expect(typeof t).toBe('object')
    })
  })

  describe('Transport', () => {
    let t = transport.build()
    let expectedResponse = 'YABADABA'

    describe('#get', () => {
      it('make GET request', () => {
        nock('http://example.com').get('/path').reply(200, expectedResponse)

        return t.get('http://example.com/path').then(response => {
          expect(response.body).toBe(expectedResponse)
        })
      })

      it('send headers', () => {
        nock('http://example.com', { reqheaders: { 'X-Header': expectedResponse } })
          .get('/path')
          .reply(200, expectedResponse)

        return t.get('http://example.com/path', { 'X-Header': expectedResponse }).then(response => {
          expect(response.body).toBe(expectedResponse)
        })
      })
    })

    describe('#getWithToken', () => {
      it('make GET request with headers', () => {
        let expectedToken = 'tkn'
        nock('http://example.com', { reqheaders: { 'authorization': `Paywall ${expectedToken}` } })
          .get('/path')
          .reply(200, expectedResponse)

        return t.getWithToken('http://example.com/path', expectedToken).then(response => {
          expect(response.body).toBe(expectedResponse)
        })
      })
    })

    describe('#requestToken', () => {
      let channelId = channel.id(Buffer.from(randomInteger().toString()))
      let payment = new channel.Payment({
        channelId: channelId.toString(),
        sender: 'sender',
        receiver: 'receiver',
        price: 10,
        value: 12,
        channelValue: 10,
        v: 1,
        r: '0x2',
        s: '0x3'
      })

      let randomToken = randomInteger().toString()
      nock('http://example.com').post('/path').reply(202, '', {
        'paywall-token': randomToken
      })

      it('send payment, get token', () => {
        return t.requestToken('http://example.com/path', payment).then(token => {
          expect(token).toBe(randomToken)
        })
      })
    })
  })

  describe('PaymentRequired', () => {
    describe('.parse', () => {
      let headers = {
        'paywall-address': '0xdeadbeaf',
        'paywall-price': '10',
        'paywall-gateway': 'http://example.com/gateway'
      }
      let paymentRequired = transport.PaymentRequired.parse(headers)
      expect(paymentRequired.receiver).toBe(headers['paywall-address'])
      expect(paymentRequired.price.toString()).toBe(headers['paywall-price'])
      expect(paymentRequired.gateway).toBe(headers['paywall-gateway'])
    })
  })
})
