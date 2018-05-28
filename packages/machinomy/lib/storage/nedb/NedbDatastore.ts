import * as Datastore from 'nedb'

export default class NedbDatastore {
  datastore: Datastore

  constructor (datastore: Datastore) {
    this.datastore = datastore
  }

  find<A> (query: any): Promise<Array<A>> {
    return new Promise<Array<A>>((resolve, reject) => {
      this.datastore.find<A>(query, (error, documents) => {
        error ? reject(error) : resolve(documents)
      })
    })
  }

  findOne<A> (query: any): Promise<A> {
    return new Promise<A>((resolve, reject) => {
      this.datastore.findOne<A>(query, (error, documents) => {
        error ? reject(error) : resolve(documents)
      })
    })
  }

  update<A> (query: any, updateQuery: any, options?: Nedb.UpdateOptions): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      this.datastore.update<A>(query, updateQuery, options, (error, numberOfUpdates, upsert) => {
        error ? reject(error) : resolve(numberOfUpdates)
      })
    })
  }

  insert<A> (newDoc: A): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.datastore.insert(newDoc, (err) => {
        err ? reject(err) : resolve()
      })
    })
  }

  count (query: any): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      this.datastore.count(query, (err, count) => {
        err ? reject(err) : resolve(count)
      })
    })
  }

  remove (query: any, options: any): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      this.datastore.remove(query, options, (err, count) => {
        err ? reject(err) : resolve(count)
      })
    })
  }
}
