import * as fs from 'fs'

let MongoClient: any

try {
  MongoClient = require('mongodb').MongoClient
} catch (e) {
  MongoClient = {}
}

let PGClient: any

try {
  PGClient = require('pg').Client
} catch (e) {
  PGClient = {}
}

import Datastore = require('nedb')

let DS: any

try {
  DS = require('nedb')
} catch (e) {
  DS = {}
}

import { Database as SQLiteDatabase } from 'sqlite3'
let sqlite: any

try {
  sqlite = require('sqlite3')
} catch (e) {
  sqlite = {}
}

import pify from '../util/pify'

export default interface Engine {
  connect (): Promise<any>
  isConnected (): boolean
  close (): Promise<any>
  drop (): Promise<any>
  exec (cb: Function): Promise<any>
}

export class EngineMongo implements Engine {
  private url: string

  private connectionInProgress?: Promise<any>

  private _client: any

  constructor (url: string) {
    this.url = url
  }

  connect (): Promise<any> {
    if (this.connectionInProgress) {
      return this.connectionInProgress
    }

    this.connectionInProgress = new Promise((resolve, reject) => {
      MongoClient.connect(this.url, (err: any, db: any) => {
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
      db[path] = new DS({ filename: path, autoload: true, inMemoryOnly: inMemoryOnly })
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
  private url?: string

  private connectionInProgress?: Promise<any>

  private _client: any

  constructor (url?: string) {
    this.url = url
  }

  connect (): Promise<any> {
    if (this.connectionInProgress) {
      return this.connectionInProgress
    }

    const client = new PGClient(this.url ? {
      connectionString: this.url
    } : undefined)

    this.connectionInProgress = client.connect().then(() => {
      this._client = client
    })

    return this.connectionInProgress!
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

export class EngineSQLite implements Engine {
  datastore: SQLiteDatabase

  constructor (path: string, inMemoryOnly: boolean = false) {
    if (path.startsWith('sqlite://')) {
      path = path.replace('sqlite://', '')
    }
    if (db[path]) {
      this.datastore = db[path]
    } else {
      if (inMemoryOnly) {
        db[path] = new sqlite.Database(':memory:')
      } else {
        db[path] = new sqlite.Database(path)
      }

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
    return this.exec((client: SQLiteDatabase) => pify((cb: Function) => client.close()))
  }

  drop (): Promise<any> {
    return this.exec((client: SQLiteDatabase) => {
      return pify((cb: Function) => {
        client.get('PRAGMA database_list', (err: Error | null, row: any) => {
          if (err) {
            console.error('Error while PRAGMA database_list')
          } else {
            if (row.file && row.file.length > 0) {
              fs.unlinkSync(row.file)
            }
          }
        })
      })
    })
  }

  exec (cb: Function): Promise<any> {
    return Promise.resolve(this.datastore)
      .then((ds) => cb(ds))
  }
}
