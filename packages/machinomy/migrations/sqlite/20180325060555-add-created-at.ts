import { Base as DBMigrateBase } from 'db-migrate-base'

let _meta: Object = {
  version: 1
}

exports.up = (db: any, callback: Function) => {
  return db.addColumn('payment', 'createdAt', {
    type: 'bigint'
  })
}

exports.down = (db: DBMigrateBase, callback: Function) => {
  exports.removeColumn(db, 'payment', 'createdAt', callback)
}

exports.removeColumn = (db: any, tableName: string, columnName: string, cb: Function) => {
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
      cb()
    }
  })
}
