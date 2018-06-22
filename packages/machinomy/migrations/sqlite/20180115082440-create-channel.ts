import bigNumberColumn from './util/bigNumberColumn'
import { Base as DBMigrateBase, CallbackFunction } from 'db-migrate-base'

let dbm: any
let _meta: Object = {
  version: 1
}

exports.setup = (options: any, seedLink: any) => {
  dbm = options.dbmigrate
}

exports.up = (db: any, callback: CallbackFunction) => {
  const createTableOptions = {
    columns:
    {
      channelId: {
        type: 'string',
        primaryKey: true
      } ,
      kind: 'string',
      sender: 'string',
      receiver: 'string',
      value: bigNumberColumn,
      spent: bigNumberColumn,
      state: 'smallint',
      contractAddress: 'string'
    },
    ifNotExists: true
  }
  db.createTable('channel', createTableOptions, callback)
}

exports.down = (db: DBMigrateBase, callback: CallbackFunction) => {
  db.dropTable('channel', callback)
}
