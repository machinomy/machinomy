'use strict'

const tmp = require('tmp')
const assert = require('assert')
const mocha = require('mocha')
const Promise = require('bluebird')

const storage = require('../lib/storage')

const describe = mocha.describe
const it = mocha.it

const tmpFileName = Promise.promisify(tmp.tmpName)

describe('storage', () => {
  describe('.engine', () => {
    it('returns Engine instance', () => {
      tmpFileName().then(filename => {
        let engine = storage.engine(filename, true)
        assert.equal(typeof engine, 'object')
      })
    })
  })

  describe('Engine', () => {
    let engine = tmpFileName().then(filename => {
      return storage.engine(filename, true)
    })

    describe('#insert and #find', () => {
      it('match the data', done => {
        const name = 'foo'
        engine.then(engine => {
          return engine.insert({name: name}).then(() => {
            return engine.find({name: name})
          })
        }).then(returnedDocs => {
          assert.equal(returnedDocs.length, 1)
          assert.equal(returnedDocs[0].name, name)
        }).then(done)
      })
    })

    describe('#insert and #findOne', () => {
      it('match the data', done => {
        const name = 'foo'
        engine.then(engine => {
          return engine.insert({name: name}).then(() => {
            return engine.findOne({name: name})
          })
        }).then(doc => {
          assert.equal(doc.name, name)
        }).then(done)
      })
    })

    describe('#update', () => {
      it('updates the data', done => {
        const name = 'foo'
        const randomInteger = Math.floor(Math.random() * 100)
        engine.then(engine => {
          return engine.insert({name: name}).then(() => {
            let update = {
              $set: { nonce: randomInteger }
            }
            return engine.update({name: name}, update).then(() => {
              return engine.findOne({name: name})
            })
          })
        }).then(doc => {
          assert.equal(doc.name, name)
          assert.equal(doc.nonce, randomInteger)
        }).then(done)
      })
    })
  })

  describe('.channels', () => {
    it('returns ChannelsDatabase instance', () => {
      tmpFileName().then(filename => {
        let engine = storage.engine(filename)
        let channels = storage.channels(engine)
        assert.equal(typeof channels, 'object')
      })
    })
  })
})
