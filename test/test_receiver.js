'use strict'

const tmp = require('tmp')
const assert = require('assert')
const mocha = require('mocha')
const Promise = require('bluebird')

const receiver = require('../lib/receiver')
const storage = require('../lib/storage')

const describe = mocha.describe
const it = mocha.it

const tmpFileName = Promise.promisify(tmp.tmpName)

const randomStorage = () => {
  return tmpFileName().then(filename => {
    return storage.build(filename)
  })
}

describe('receiver', () => {
  describe('.build', () => {
    it('builds Receiver', done => {
      randomStorage().then(storage => {
        let result = receiver.build('0xdeadbeaf', storage)
        assert.equal(typeof result, 'object')
      }).then(done)
    })
  })
})
