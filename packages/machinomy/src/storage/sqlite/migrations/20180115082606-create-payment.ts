import { Base, CallbackFunction } from 'db-migrate-base'
import bigNumberColumn from './util/bigNumberColumn'

export function up (db: Base, callback: CallbackFunction) {
  const createTableOptions = {
    columns: {
      channelId: {
        type: 'string',
        notNull: true,
        foreignKey: {
          name: 'tokens_channel_id_fk',
          table: 'channel',
          mapping: 'channelId',
          rules: {
            onDelete: 'CASCADE'
          }
        }
      },
      kind: 'string',
      token: {
        type: 'string',
        notNull: true,
        unique: true
      },
      sender: 'string',
      receiver: 'string',
      price: bigNumberColumn,
      value: bigNumberColumn,
      channelValue: bigNumberColumn,
      v: 'int',
      r: 'string',
      s: 'string',
      meta: 'string',
      contractAddress: 'string'
    },
    ifNotExists: true
  }
  db.createTable('payment', createTableOptions, callback)
}

export function down (db: Base, callback: CallbackFunction) {
  db.dropTable('payment', callback)
}
