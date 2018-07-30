import NedbMigrator from './NedbMigrator'
import * as asPromised from 'chai-as-promised'
import { assert, use } from 'chai'

use(asPromised)

const migrator = new NedbMigrator()

describe('NedbMigrator', () => {
  context('isLatest', () => {
    specify('return true', async () => {
      assert.isTrue(await migrator.isLatest())
    })
  })

  context('sync', () => {
    specify('resolve Promise', async () => {
      return assert.isFulfilled(migrator.sync())
    })
  })
})
