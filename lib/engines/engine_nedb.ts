import Datastore = require('nedb')
import Engine from './engine'
import pify from '../util/pify'
/**
 * Database engine.
 */
let db: any = {}

export default class EngineNedb implements Engine {
  datastore: Datastore

  constructor (path: string, inMemoryOnly: boolean = false) {
    if (db[path]) {
      this.datastore = db[path]
    } else {
      db[path] = new Datastore({ filename: path, autoload: true, inMemoryOnly: inMemoryOnly })
      this.datastore = db[path]
    }
  }

  connect (): Promise<any> {
    return Promise.resolve()
  }

  close (): Promise<any> {
    return Promise.resolve()
  }

  drop (): Promise<any> {
    return this.exec((client: any) => pify((cb: Function) => client.remove({}, { multi: true }, cb)))
  }

  exec (cb: Function): Promise<any> {
    return Promise.resolve(this.datastore)
      .then((ds) => cb(ds))
  }
}
