import * as sinon from 'sinon'
import EnginePostgres from './storage/postgresql/EnginePostgres'

const expect = require('expect')

const PGClient = require('pg').Client

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
