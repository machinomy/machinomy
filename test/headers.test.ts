import { default as Sender, ResponseHeaders } from '../lib/sender'
import * as configuration from '../lib/configuration'
import * as channel from '../lib/channel'
import * as transport from '../lib/transport'
import * as storage from '../lib/storage'
import Web3 = require('web3')

let expect = require('expect')

describe('Headers', function () {
  let settings = configuration.sender()
  let web3 = new Web3()
  web3.setProvider(configuration.currentProvider())
  if (web3.personal) {
    // web3.personal.unlockAccount(account, password, UNLOCK_PERIOD) // FIXME
  }

  let _transport = transport.build()
  let _storage = storage.build(web3, settings.databaseFile, 'sender', false, settings.engine)
  let contract = channel.contract(web3)
  let client = new Sender(web3, settings.account!, contract, _transport, _storage)

  describe('extractPaymentRequired', function () {
    const request: ResponseHeaders = {
      headers: {
        'paywall-version': '0.0.3',
        'paywall-price': '0.1',
        'paywall-address': '0xebeab176c2ca2ae72f11abb1cecad5df6ccb8dfe',
        'paywall-gateway': 'http://localhost:3001/machinomy'
      }
    }

    it('all headers', (done) => {
      client.extractPaymentRequired(request).then((paymentRequired) => {
        return expect(paymentRequired).not.toBe(null)
      }).catch(e => {
        return expect(e).toBe(null)
      }).then(done).catch(e => {
        done(e)
      })
    })

    it('-paywall-version', (done) => {
      let _request = {headers: Object.assign({}, request.headers)}
      delete _request.headers['paywall-version']
      client.extractPaymentRequired(_request).then(paymentRequired => {
        return expect(paymentRequired).toBe(null)
      }).catch(e => {
        return expect(e.message.indexOf('paywall-version')).not.toBe(-1)
      }).then(done).catch(e => {
        done(e)
      })
    })

    it('-paywall-price', (done) => {
      let _request = {headers: Object.assign({}, request.headers)}
      delete _request.headers['paywall-price']
      client.extractPaymentRequired(_request).then(paymentRequired => {
        return expect(paymentRequired).toBe(null)
      }).catch(e => {
        return expect(e.message.indexOf('paywall-price')).not.toBe(-1)
      }).then(done).catch(e => {
        done(e)
      })
    })

    it('-paywall-address', (done) => {
      let _request = {headers: Object.assign({}, request.headers)}
      delete _request.headers['paywall-address']
      client.extractPaymentRequired(_request).then(paymentRequired => {
        return expect(paymentRequired).toBe(null)
      }).catch(e => {
        return expect(e.message.indexOf('paywall-address')).not.toBe(-1)
      }).then(done).catch(e => {
        done(e)
      })
    })

    it('-paywall-gateway', (done) => {
      let _request = {headers: Object.assign({}, request.headers)}
      delete _request.headers['paywall-gateway']
      client.extractPaymentRequired(_request).then(paymentRequired => {
        return expect(paymentRequired).toBe(null)
      }).catch(e => {
        return expect(e.message.indexOf('paywall-gateway')).not.toBe(-1)
      }).then(done).catch(e => {
        done(e)
      })
    })
  })
})
