import { Base, CallbackFunction } from 'db-migrate-base'

export function up (db: Base, callback: CallbackFunction) {
  return db.addColumn('payment', 'createdAt', {
    type: 'bigint'
  }, callback)
}

export function down (db: Base, callback: CallbackFunction) {
  return db.removeColumn('payment', 'createdAt', callback)
}
