import serviceRegistry from '../container'

const MongoClient = require('mongodb').MongoClient
const PGClient = require('pg').Client

import Datastore = require('nedb')
import pify from '../util/pify'
import { MachinomyOptions } from '../../index'

export default interface Engine {
  connect (): Promise<any>
  isConnected (): boolean
  close (): Promise<any>
  drop (): Promise<any>
  exec (cb: Function): Promise<any>
}

export class EngineMongo implements Engine {
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

let db: any = {}

export class EngineNedb implements Engine {
  datastore: Datastore

  constructor (path: string, inMemoryOnly: boolean = false) {
    if (db[path]) {
      this.datastore = db[path]
    } else {
      db[path] = new Datastore({ filename: path, autoload: true, inMemoryOnly: inMemoryOnly })
      this.datastore = db[path]
    }
  }

  isConnected (): boolean {
    return true
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

export class EnginePostgres implements Engine {
  connectionInProgress: Promise<any>

  _client: any

  connect (): Promise<any> {
    if (this.connectionInProgress) {
      return this.connectionInProgress
    }

    const client = new PGClient()

    this.connectionInProgress = client.connect().then(() => {
      this._client = client
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

    return this._client.end()
      .then(() => (this._client = null))
  }

  drop (): Promise<any> {
    return this.exec((client: any) => {
      return Promise.all([
        client.query('TRUNCATE channel CASCADE'),
        client.query('TRUNCATE payment CASCADE'),
        client.query('TRUNCATE token CASCADE')
      ])
    })
  }

  exec (cb: Function): Promise<any> {
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

serviceRegistry.bind('Engine', (options: MachinomyOptions): Engine => {
  if (options.engine === 'nedb' && !options.databaseFile) {
    throw new Error('No database file found.')
  }

  switch (options.engine) {
    case 'nedb':
      return new EngineNedb(options.databaseFile as string, false)
    case 'mongo':
      return new EngineMongo()
    case 'postgres':
      return new EnginePostgres()
  }

  if (typeof options.engine === 'object') {
    return options.engine
  }

  throw new Error(`Invalid engine: ${options.engine}.`)
}, ['MachinomyOptions'])
