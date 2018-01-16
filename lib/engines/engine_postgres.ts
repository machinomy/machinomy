const PGClient = require('pg').Client

import Engine from './engine'

export default class EnginePostgres implements Engine {
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
