
import Promise = require('bluebird')
import Datastore = require('nedb')
import Engine from './engine'
/**
 * Database engine.
 */
export default class EngineNedb implements Engine {
  datastore: Datastore
  _find: (query: any) => Promise<any[]>
  _findOne: (query: any) => Promise<any>
  _insert: (document: any) => Promise<void>
  _update: (query: any, update: any, option: object) => Promise<void>

  constructor (path: string, inMemoryOnly: boolean = false) {
    this.datastore = new Datastore({ filename: path, autoload: true, inMemoryOnly: inMemoryOnly })
    this._find = Promise.promisify(this.datastore.find, { context: this.datastore })
    this._findOne = Promise.promisify(this.datastore.findOne, { context: this.datastore })
    this._insert = Promise.promisify(this.datastore.insert, { context: this.datastore })
    this._update = Promise.promisify(this.datastore.update, { context: this.datastore })
  }

  find<A> (query: object): Promise<Array<A>> {
    return this._find(query)
  }

  findOne<A> (query: object): Promise<A|null> {
    return this._findOne(query)
  }

  insert (document: object): Promise<void> {
    return this._insert(document)
  }

  update (query: object, update: object): Promise<void> {
    return this._update(query, update, {})
  }
}
