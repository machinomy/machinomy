import Datastore = require('nedb')
import * as sinon from 'sinon'
import { tmpFileName } from './support'
import { EngineMongo, EngineNedb, EnginePostgres } from '../lib/engines/engine'

const expect = require('expect')

const MongoClient = require('mongodb').MongoClient
const PGClient = require('pg').Client

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
    it('provides a client to the callback', () => {
      const stub = sinon.stub(MongoClient, 'connect')
        .callsFake((conn: string, cb: Function) => setImmediate(cb(null, 'fake client')))

      return engine.connect()
        .then(() => engine.exec((client: any) => expect(client).toEqual('fake client')))
        .then(() => stub.restore())
    })

    it('lazily connects to the database', () => {
      const stub = sinon.stub(MongoClient, 'connect')
        .callsFake((conn: string, cb: Function) => setImmediate(cb(null, 'fake client')))

      return engine.exec((client: any) => expect(client).toEqual('fake client'))
        .then(() => expect(stub.callCount).toBe(1))
        .then(() => stub.restore())
    })
  })
})

describe('EngineNedb', () => {
  let engine: EngineNedb

  let removeStub: sinon.SinonSpy

  beforeEach(() => {
    removeStub = sinon.stub(Datastore.prototype, 'remove')
      .callsFake((query: object, options: object, cb: Function) => {
        cb(null)
      })

    return tmpFileName().then((path) => {
      engine = new EngineNedb(path, true)
    })
  })

  afterEach(() => {
    removeStub.restore()
  })

  describe('drop', () => {
    it('executes a multi remove', () => {
      return engine.drop()
        .then(() => {
          expect(removeStub.callCount).toBe(1)
          expect(removeStub.calledWith({}, { multi: true }, sinon.match.func))
            .toBe(true)
        })
    })
  })

  describe('exec', () => {
    it('provides a client to the callback', () => {
      return engine.exec((client: any) => {
        expect(client instanceof Datastore).toBe(true)
      })
    })
  })
})

describe('EnginePostgres', () => {
  let engine: EnginePostgres

  beforeEach(() => {
    engine = new EnginePostgres()
  })

  describe('isConnected', () => {
    it('defaults to false', () => {
      expect(engine.isConnected()).toBe(false)
    })
  })

  describe('connect', () => {
    it('connects to the database', () => {
      const stub = sinon.stub(PGClient.prototype, 'connect').resolves()

      return engine.connect()
        .then(() => {
          expect(stub.callCount).toBe(1)
          stub.restore()
        })
    })

    it('prevents multiple concurrent connections', () => {
      const stub = sinon.stub(PGClient.prototype, 'connect').resolves()

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
      const stub = sinon.stub(PGClient.prototype, 'connect').resolves()

      return engine.connect()
        .then(() => {
          expect(engine.isConnected()).toBe(true)
          stub.restore()
        })
    })
  })

  describe('close', () => {
    it('closes connection to the database', () => {
      const connectStub = sinon.stub(PGClient.prototype, 'connect').resolves()
      const endStub = sinon.stub(PGClient.prototype, 'end').resolves()

      return engine.connect()
        .then(() => engine.close())
        .then(() => expect(endStub.callCount).toBe(1))
        .then(() => {
          connectStub.restore()
          endStub.restore()
        })
    })

    it('marks isConnected as false', () => {
      const connectStub = sinon.stub(PGClient.prototype, 'connect').resolves()
      const endStub = sinon.stub(PGClient.prototype, 'end').resolves()

      return engine.connect()
        .then(() => engine.close())
        .then(() => {
          expect(engine.isConnected()).toBe(false)
          connectStub.restore()
          endStub.restore()
        })
    })
  })

  describe('drop', () => {
    it('truncates all tables', () => {
      const connectStub = sinon.stub(PGClient.prototype, 'connect').resolves()
      const queryStub = sinon.stub(PGClient.prototype, 'query').resolves()

      return engine.connect()
        .then(() => engine.drop())
        .then(() => {
          expect(queryStub.callCount).toBe(3)
          expect(queryStub.calledWith('TRUNCATE channel CASCADE'))
          expect(queryStub.calledWith('TRUNCATE payment CASCADE'))
          expect(queryStub.calledWith('TRUNCATE token CASCADE'))
          connectStub.restore()
          queryStub.restore()
        })
    })

    it('lazily connects to the database', () => {
      const connectStub = sinon.stub(PGClient.prototype, 'connect').resolves()
      const queryStub = sinon.stub(PGClient.prototype, 'query').resolves()

      return engine.drop()
        .then(() => {
          expect(connectStub.callCount).toBe(1)
          connectStub.restore()
          queryStub.restore()
        })
    })
  })

  describe('exec', () => {
    it('returns an instance of the client', () => {
      const connectStub = sinon.stub(PGClient.prototype, 'connect').resolves()

      return engine.connect()
        .then(() => engine.exec((client: any) => expect(client instanceof PGClient).toBe(true)))
        .then(() => connectStub.restore())
    })

    it('lazily connects to the database', () => {
      const connectStub = sinon.stub(PGClient.prototype, 'connect').resolves()

      return engine.exec(() => 'beep')
        .then(() => expect(connectStub.callCount).toBe(1))
        .then(() => connectStub.restore())
    })
  })
})
