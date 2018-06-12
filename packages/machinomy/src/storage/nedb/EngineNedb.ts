import * as Datastore from 'nedb'
import IEngine from '../IEngine'
import IExec from '../IExec'
import MigratorNedb from './MigratorNedb'
import NedbDatastore from './NedbDatastore'

let db = new Map<string, NedbDatastore>()

export default class EngineNedb implements IEngine, IExec<NedbDatastore> {
  datastore: NedbDatastore
  migrator: MigratorNedb

  constructor (path: string, inMemoryOnly: boolean = false) {
    let found = db.get(path)
    if (found) {
      this.datastore = found
    } else {
      let datastore = new Datastore({ filename: path, autoload: true, inMemoryOnly: inMemoryOnly })
      this.datastore = new NedbDatastore(datastore)
      db.set(path, this.datastore)
    }
    this.migrator = new MigratorNedb(this)
  }

  isConnected (): boolean {
    return true
  }

  connect (): Promise<void> {
    return Promise.resolve()
  }

  close (): Promise<void> {
    return Promise.resolve()
  }

  async drop (): Promise<void> {
    await this.exec(async client => {
      await client.remove({}, { multi: true })
    })
  }

  async exec <B> (fn: (client: NedbDatastore) => B): Promise<B> {
    return fn(this.datastore)
  }

  migrate (): MigratorNedb {
    return this.migrator
  }
}
