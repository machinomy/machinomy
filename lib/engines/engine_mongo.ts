const MongoClient = require('mongodb').MongoClient

import Engine from './engine'

/**
 * Database engine.
 */
export default class EngineMongo implements Engine {
  connectionInProgress: Promise<any>

  _client: any

  connect (): Promise<any> {
    if (this.connectionInProgress) {
      return this.connectionInProgress
    }

    this.connectionInProgress = new Promise((resolve, reject) => {
      MongoClient.connect('mongodb://localhost:27017/machinomy', (err: any, db: any) => {
        if (err) {
          return reject(err)
        }

        this._client = db
        resolve()
      })
    })

    return this.connectionInProgress
  }

  isConnected (): boolean {
    return Boolean(this._client)
  }

  close (): Promise<any> {
    if (!this._client) {
      return Promise.resolve()
    }

    return this._client.close()
      .then(() => (this._client = null))
  }

  drop (): Promise<any> {
    return this.ensureConnection().then(() => {
      return new Promise<void>((resolve, reject) => {
        this._client.dropDatabase((err: any) => {
          if (err) {
            return reject(err)
          }

          return resolve()
        })
      })
    })
  }

  exec (cb: Function): any {
    return this.ensureConnection()
      .then(() => cb(this._client))
  }

  ensureConnection (): Promise<void> {
    if (this._client) {
      return Promise.resolve()
    }

    return this.connect()
  }
}
