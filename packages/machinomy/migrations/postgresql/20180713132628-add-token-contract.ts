import { Base as DBMigrateBase, CallbackFunction } from 'db-migrate-base'

let _meta: Object = {
  version: 1
}

exports.up = (db: any, callback: CallbackFunction) => {
  return db.addColumn('payment', 'tokenContract', {
    type: 'string'
  }, callback)
}

exports.down = (db: DBMigrateBase, callback: CallbackFunction) => {
  return db.removeColumn('payment', 'tokenContract', callback)
}
