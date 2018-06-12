import IEngine from '../IEngine'
import { MongoClient, Db } from 'mongodb'
import IExec from '../IExec'
import MigratorMongo from './MigratorMongo'

export default class EngineMongo implements IEngine, IExec<Db> {
  private readonly url: string
  private connectionInProgress: Promise<Db> | null
  private _client: Db | null
  private migrator: MigratorMongo

  constructor (url: string) {
    this.url = url
    this._client = null
    this.connectionInProgress = null
    this.migrator = new MigratorMongo(this)
  }

  async connect (): Promise<void> {
    await this.ensureConnection()
  }

  isConnected (): boolean {
    return Boolean(this._client)
  }

  async close (): Promise<void> {
    if (this._client) {
      await this._client.close()
      this._client = null
    } else {
      return
    }
  }

  async drop (): Promise<void> {
    let db = await this.ensureConnection()
    return new Promise<void>((resolve, reject) => {
      db.dropDatabase((err: any) => {
        err ? reject(err) : resolve()
      })
    })
  }

  async exec<B> (fn: (client: Db) => B): Promise<B> {
    let client = await this.ensureConnection()
    return fn(client)
  }

  async ensureConnection (): Promise<Db> {
    if (this._client) {
      return this._client
    }

    if (this.connectionInProgress) {
      return this.connectionInProgress
    }

    this.connectionInProgress = new Promise((resolve, reject) => {
      MongoClient.connect(this.url, (err: any, db: Db) => {
        if (err) {
          return reject(err)
        }

        this._client = db
        resolve(db)
      })
    })

    return this.connectionInProgress
  }

  migrate (): MigratorMongo {
    return this.migrator
  }
}
