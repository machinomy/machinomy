import PostgresqlMigrator from './PostgresqlMigrator'
import * as sinon from 'sinon'
import { assert } from 'chai'

describe('PostgresqlMigrator', () => {
  let migrator = new PostgresqlMigrator('postgresql://dummy@example.com/example')

  describe('.isLatest', () => {
    specify('pass db-migrate.check', async () => {
      let trueStub = sinon.stub(migrator.dbmigrate, 'check').returns(Promise.resolve(true))
      assert.isTrue(await migrator.isLatest())
      assert.isTrue(trueStub.called)
      trueStub.restore()

      let falseStub = sinon.stub(migrator.dbmigrate, 'check').returns(Promise.resolve(false))
      assert.isFalse(await migrator.isLatest())
      assert.isTrue(falseStub.called)
      falseStub.restore()
    })
  })

  describe('.sync', () => {
    specify('pass db-migrate.sync', async () => {
      let destination = 'n'
      let stub = sinon.stub(migrator.dbmigrate, 'sync').returns(Promise.resolve())
      await migrator.sync(destination)
      assert.isTrue(stub.calledWith(destination))
      stub.restore()
    })

    specify('pass latest migration to db-migrate.sync', async () => {
      let destination = 'm'
      let last = sinon.stub(migrator, 'lastMigrationNumber').returns(Promise.resolve(destination))
      let stub = sinon.stub(migrator.dbmigrate, 'sync').returns(Promise.resolve())
      await migrator.sync()
      assert.isTrue(stub.calledWith(destination))
      stub.restore()
      last.restore()
    })
  })
})
