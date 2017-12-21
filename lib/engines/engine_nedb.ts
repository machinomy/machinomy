import Datastore = require('nedb')
import Engine from './engine'
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

  find<A> (query: object): Promise<Array<A>> {
    return new Promise((resolve: Function, reject: Function) => {
      this.datastore.find(query, (err: Error, res: Array<A>) => {
        if (err) {
          return reject(err)
        }
        resolve(res)
      })
    })
  }

  findOne<A> (query: object): Promise<A|null> {
    return new Promise((resolve: Function, reject: Function) => {
      this.datastore.findOne(query, (err: Error, res: A) => {
        if (err) {
          return reject(err)
        }
        resolve(res)
      })
    })
  }

  insert (document: object): Promise<void> {
    return new Promise((resolve: Function, reject: Function) => {
      this.datastore.insert(document, (err: Error, res: any) => {
        if (err) {
          return reject(err)
        }
        resolve(res)
      })
    })
  }

  update (query: object, update: object): Promise<void> {
    return new Promise((resolve: Function, reject: Function) => {
      this.datastore.update(query, update, {}, (err: Error, res: any) => {
        if (err) {
          return reject(err)
        }
        resolve(res)
      })
    })
  }
}
