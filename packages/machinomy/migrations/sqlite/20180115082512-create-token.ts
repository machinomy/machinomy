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
    columns: {
      token: 'string',
      kind: 'string',
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
      }
    },
    ifNotExists: true
  }
  db.createTable('token', createTableOptions, callback)
}

exports.down = (db: DBMigrateBase, callback: CallbackFunction) => {
  db.dropTable('token', callback)
}
