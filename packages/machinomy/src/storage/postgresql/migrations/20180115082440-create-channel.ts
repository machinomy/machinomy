import bigNumberColumn from './util/bigNumberColumn'
import { Base, CallbackFunction } from 'db-migrate-base'

export function up (db: Base, callback: CallbackFunction) {
  const createTableOptions = {
    columns:
    {
      channelId: {
        type: 'string',
        primaryKey: true
      },
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

export function down (db: Base, callback: CallbackFunction) {
  db.dropTable('channel', callback)
}
