import IExec from '../IExec'
import IEngine from '../IEngine'
import * as fs from 'fs'
import * as sqlite from 'sqlite3'
import MigratorSqlite from './MigratorSqlite'
import SqliteDatastore from './SqliteDatastore'

let db = new Map<string, SqliteDatastore>()

export default class EngineSqlite implements IEngine, IExec<SqliteDatastore> {
  private readonly datastore: SqliteDatastore
  private migrator: MigratorSqlite

  constructor (url: string, migrateOptions?: Object | string) {
    if (url.startsWith('sqlite://')) {
      url = url.replace('sqlite://', '')
    }
    let found = db.get(url)
    if (found) {
      this.datastore = found
    } else {
      this.datastore = new SqliteDatastore(new sqlite.Database(url))
      db.set(url, this.datastore)
    }
    this.migrator = new MigratorSqlite(this, migrateOptions)
  }

  isConnected (): boolean {
    return true
  }

  async connect (): Promise<any> {
    return Promise.resolve()
  }

  async close (): Promise<void> {
    return this.exec(async client => {
      return client.close()
    })
  }

  async drop (): Promise<any> {
    return this.exec(async client => {
      let row = await client.get<{file: string}>('PRAGMA database_list')
      if (row && row.file && row.file.length > 0) {
        fs.unlinkSync(row.file)
      }
    })
  }

  async exec <B> (fn: (client: SqliteDatastore) => B): Promise<B> {
    return fn(this.datastore)
  }

  migrate (): MigratorSqlite {
    return this.migrator
  }
}
