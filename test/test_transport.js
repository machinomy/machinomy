'use strict'

const assert = require('assert')
const mocha = require('mocha')
const nock = require('nock')

const transport = require('../lib/transport')

const describe = mocha.describe
const it = mocha.it

describe('transport', () => {
  describe('.build', () => {
    it('returns Transport instance', () => {
      let t = transport.build()
      assert.equal(typeof t, 'object')
    })
  })

  describe('Transport', () => {
    let t = transport.build()
    let expectedResponse = 'YABADABA'

    describe('#get', () => {
      it('makes GET request', done => {
        nock('http://example.com').get('/path').reply(200, expectedResponse)

        t.get('http://example.com/path').then(response => {
          assert.equal(response.body, expectedResponse)
        }).then(done)
      })

      it('sends headers', done => {
        nock('http://example.com', { reqheaders: { 'X-Header': expectedResponse } })
          .get('/path')
          .reply(200, expectedResponse)
        t.get('http://example.com/path', { 'X-Header': expectedResponse }).then(response => {
          assert.equal(response.body, expectedResponse)
        }).then(done)
      })
    })

    describe('#getWithToken', () => {
      it('makes GET request with headers', done => {
        let expectedToken = 'tkn'
        nock('http://example.com', { reqheaders: { 'authorization': `Paywall ${expectedToken}` } })
          .get('/path')
          .reply(200, expectedResponse)

        t.getWithToken('http://example.com/path', expectedToken).then(response => {
          assert.equal(response.body, expectedResponse)
        }).then(done)
      })
    })
  })
})
