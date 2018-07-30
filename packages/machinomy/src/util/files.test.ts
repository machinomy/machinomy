import * as files from './files'
import * as asPromised from 'chai-as-promised'
import * as chai from 'chai'
import * as path from 'path'
import * as fs from 'fs'

chai.use(asPromised)

const assert = chai.assert

const ABSENT_DIR = '/really-absent-dir'

describe('readdir', () => {
  specify('list files', async () => {
    let list = await files.readdir(__dirname)
    assert.isTrue(list.includes(path.basename(__filename)))
  })
  specify('error if absent', async () => {
    await assert.isRejected(files.readdir(ABSENT_DIR))
  })
})

describe('stats', () => {
  specify('provide stats', async () => {
    let expected = fs.statSync(__dirname)
    let actual = await files.stat(__dirname)
    assert.deepEqual(actual, expected)
  })
  specify('error if absent', async () => {
    await assert.isRejected(files.stat(ABSENT_DIR))
  })
})
