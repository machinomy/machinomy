import { Base as DBMigrateBase, CallbackFunction } from 'db-migrate-base'

let _meta: Object = {
  version: 1
}

exports.up = (db: any, callback: CallbackFunction) => {
  return db.addColumn('payment', 'createdAt', {
    type: 'bigint'
  }, callback)
}

exports.down = (db: DBMigrateBase, callback: CallbackFunction) => {
  exports.removeColumnSqlite(db, 'payment', 'createdAt', callback)
}

exports.removeColumnSqlite = (db: any, tableName: string, columnName: string, cb: CallbackFunction) => {
  db.all(`PRAGMA table_info(${tableName});`, async (err: Error, rows: any[]) => {
    if (err) {
      console.error(err)
    } else {
      const sqlNamesWithTypes = rows.filter((element) => {
        return element.name !== columnName
      }).map((element: any) => {
        return `${element.name} ${element.type}`
      }).join(', ')

      const sqlNames = rows.filter((element: any) => {
        return element.name !== columnName
      }).map((element: any) => {
        return `${element.name}`
      }).join(', ')
      const removeColumnSql =
        `
        CREATE TEMPORARY TABLE ${tableName + '_backup'}(${sqlNamesWithTypes});
        INSERT INTO ${tableName + '_backup'} SELECT ${sqlNames} FROM ${tableName};
        DROP TABLE ${tableName};
        CREATE TABLE ${tableName}(${sqlNamesWithTypes});
        INSERT INTO ${tableName} SELECT ${sqlNames} FROM ${tableName + '_backup'};
        DROP TABLE ${tableName + '_backup'};
       `
      await db.runSql(removeColumnSql)
      cb(null, 'ok')
    }
  })
}
