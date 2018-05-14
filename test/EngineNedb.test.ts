import * as sinon from 'sinon'
import * as expect from 'expect'
import { tmpFileName } from './support'
import EngineNedb from '../lib/storage/nedb/EngineNedb'
import NedbDatastore from '../lib/storage/nedb/NedbDatastore'

describe('EngineNedb', () => {
  let engine: EngineNedb
  let removeStub: sinon.SinonSpy

  beforeEach(async () => {
    removeStub = sinon.stub(NedbDatastore.prototype, 'remove')
      .callsFake((query: object, options: object) => {
        return Promise.resolve(1)
      })

    let path = await tmpFileName()
    engine = new EngineNedb(path, true)
  })

  afterEach(() => {
    removeStub.restore()
  })

  describe('drop', () => {
    it('executes a multi remove', async () => {
      await engine.drop()
      expect(removeStub.callCount).toBe(1)
      expect(removeStub.calledWith({}, { multi: true })).toBe(true)
    })
  })

  describe('exec', () => {
    it('provides a client to the callback', async () => {
      await engine.exec(client => {
        expect(client instanceof NedbDatastore).toBe(true)
        return Promise.resolve()
      })
    })
  })
})
