import Promise = require('bluebird')
import mongo from '../mongo';
import Engine from './engine'

/**
 * Database engine.
 */
export default class EngineMongo implements Engine {
  constructor (path: string, inMemoryOnly: boolean = false) {}

  find<A> (query: {kind: string}): Promise<Array<A>> {
    let collection = query.kind || 'all'
    return new Promise((resolve: Function, reject: Function) => {
      mongo.db().collection(collection).find(query).toArray((err: any, res: any) => {
        if (err) {
          return reject(err)
        }
        resolve(res)
      })
    })
  }

  findOne<A> (query: {kind: string}): Promise<A|null> {
    let collection = query.kind || 'all'
    return new Promise<A>((resolve: Function, reject: Function) => {
      mongo.db().collection(collection).findOne(query, (err: any, res: any) => {
        if (err) {
          return reject(err)
        }
        resolve(res)
      })
    })
  }

  insert(document: {kind: string}): Promise<void> {
    let collection = document.kind || 'all'
    return new Promise((resolve: Function, reject: Function) => {
      mongo.db().collection(collection).insert(document, (err: any, res: any) => {
        if (err) {
          return reject(err)
        }
        resolve()
      })
    })
  }

  update (query: {kind: string}, update: object): Promise<void> {
    let collection = query.kind || 'all'
    return new Promise((resolve: Function, reject: Function) => {
      mongo.db().collection(collection).update(query, update, {}, (err: any, res: any) => {
        if (err) {
          return reject(err)
        }
        resolve()
      })
    })
  }
}
