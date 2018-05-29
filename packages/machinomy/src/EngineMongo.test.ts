import * as sinon from 'sinon'
import * as expect from 'expect'
import { MongoClient } from 'mongodb'
import EngineMongo from './storage/mongo/EngineMongo'

describe('EngineMongo', () => {
  let engine: EngineMongo

  beforeEach(() => {
    engine = new EngineMongo('mongodb://localhost:27017/machinomy')
  })

  describe('isConnected', () => {
    it('defaults to false', () => {
      expect(engine.isConnected()).toBe(false)
    })
  })

  describe('.connect', () => {
    it('connects to the database', () => {
      const stub = sinon.stub(MongoClient, 'connect')
        .callsFake((conn: string, cb: Function) => setImmediate(cb(null, 'fake client')))

      return engine.connect()
        .then(() => {
          expect(stub.callCount).toBe(1)
          stub.restore()
        })
    })

    it('prevents multiple concurrent connections', () => {
      const stub = sinon.stub(MongoClient, 'connect')
        .callsFake((conn: string, cb: Function) => setImmediate(cb(null, 'fake client')))

      return Promise.all([
        engine.connect(),
        engine.connect(),
        engine.connect()
      ]).then(() => {
        expect(stub.callCount).toBe(1)
        stub.restore()
      })
    })

    it('marks isConnected as true', () => {
      const stub = sinon.stub(MongoClient, 'connect')
        .callsFake((conn: string, cb: Function) => setImmediate(cb(null, 'fake client')))

      return engine.connect()
        .then(() => {
          expect(engine.isConnected()).toBe(true)
          stub.restore()
        })
    })
  })

  describe('close', () => {
    it('closes the connection', () => {
      const close = sinon.stub().resolves()
      const stub = sinon.stub(MongoClient, 'connect')
        .callsFake((conn: string, cb: Function) => setImmediate(cb(null, { close })))

      return engine.connect()
        .then(() => engine.close())
        .then(() => {
          expect(close.callCount).toBe(1)
          stub.restore()
        })
    })

    it('marks isConnected as false', () => {
      const close = sinon.stub().resolves()
      const stub = sinon.stub(MongoClient, 'connect')
        .callsFake((conn: string, cb: Function) => setImmediate(cb(null, { close })))

      return engine.connect()
        .then(() => engine.close())
        .then(() => {
          expect(engine.isConnected()).toBe(false)
          stub.restore()
        })
    })
  })

  describe('drop', () => {
    it('drops the database', () => {
      const dropDatabase = sinon.stub().callsFake((cb: Function) => cb(null))
      const stub = sinon.stub(MongoClient, 'connect')
        .callsFake((conn: string, cb: Function) => setImmediate(cb(null, { dropDatabase })))

      return engine.connect()
        .then(() => engine.drop())
        .then(() => expect(dropDatabase.callCount).toBe(1))
        .then(() => stub.restore())
    })

    it('lazily connects to the database', () => {
      const dropDatabase = sinon.stub().callsFake((cb: Function) => cb(null))
      const stub = sinon.stub(MongoClient, 'connect')
        .callsFake((conn: string, cb: Function) => setImmediate(cb(null, { dropDatabase })))

      return engine.drop()
        .then(() => expect(stub.callCount).toBe(1))
        .then(() => expect(dropDatabase.callCount).toBe(1))
        .then(() => stub.restore())
    })
  })

  describe('exec', () => {
    it('provides a client to the callback', async () => {
      const stub = sinon.stub(MongoClient, 'connect')
        .callsFake((conn: string, cb: Function) => setImmediate(cb(null, 'fake client')))

      await engine.connect()
      await engine.exec(client => {
        expect(client).toEqual('fake client')
        return Promise.resolve()
      })
      stub.restore()
    })

    it('lazily connects to the database', async () => {
      const stub = sinon.stub(MongoClient, 'connect')
        .callsFake((conn: string, cb: Function) => setImmediate(cb(null, 'fake client')))
      await engine.exec(client => {
        expect(client).toEqual('fake client')
        return Promise.resolve()
      })
      stub.restore()
    })
  })
})
