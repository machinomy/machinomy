'use strict'

const assert = require('assert')
const mocha = require('mocha')
const nock = require('nock')

const channel = require('../lib/channel')
const transport = require('../lib/transport')

const describe = mocha.describe
const it = mocha.it

/**
 * @return {number}
 */
const randomInteger = () => {
  return Math.floor(Math.random() * 10000)
}

describe('transport', () => {
  describe('.build', () => {
    it('return Transport instance', () => {
      let t = transport.build()
      assert.equal(typeof t, 'object')
    })
  })

  describe('Transport', () => {
    let t = transport.build()
    let expectedResponse = 'YABADABA'

    describe('#get', () => {
      it('make GET request', done => {
        nock('http://example.com').get('/path').reply(200, expectedResponse)

        t.get('http://example.com/path').then(response => {
          assert.equal(response.body, expectedResponse)
        }).then(done)
      })

      it('send headers', done => {
        nock('http://example.com', { reqheaders: { 'X-Header': expectedResponse } })
          .get('/path')
          .reply(200, expectedResponse)
        t.get('http://example.com/path', { 'X-Header': expectedResponse }).then(response => {
          assert.equal(response.body, expectedResponse)
        }).then(done)
      })
    })

    describe('#getWithToken', () => {
      it('make GET request with headers', done => {
        let expectedToken = 'tkn'
        nock('http://example.com', { reqheaders: { 'authorization': `Paywall ${expectedToken}` } })
          .get('/path')
          .reply(200, expectedResponse)

        t.getWithToken('http://example.com/path', expectedToken).then(response => {
          assert.equal(response.body, expectedResponse)
        }).then(done)
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
        r: 2,
        s: 3
      })

      let randomToken = randomInteger().toString()
      nock('http://example.com').post('/path').reply(202, '', {
        'paywall-token': randomToken
      })

      it('send payment, get token', done => {
        t.requestToken('http://example.com/path', payment).then(token => {
          assert.equal(token, randomToken)
        }).then(done)
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
      assert.equal(paymentRequired.receiver, '0xdeadbeaf')
      assert.equal(paymentRequired.price, 10)
      assert.equal(paymentRequired.gateway, 'http://example.com/gateway')
    })
  })
})
