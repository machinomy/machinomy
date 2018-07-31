import { Base, CallbackFunction } from 'db-migrate-base'
import removeColumn from './util/removeColumn'

export function up (db: Base, callback: CallbackFunction) {
  return db.addColumn('payment', 'tokenContract', {
    type: 'string'
  }, callback)
}

export function down (db: Base, callback: CallbackFunction) {
  removeColumn(db, 'payment', 'tokenContract', callback)
}
