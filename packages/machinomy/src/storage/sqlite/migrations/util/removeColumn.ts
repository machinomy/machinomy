import { Base, CallbackFunction } from 'db-migrate-base'

interface Row {
  name: string
  type: string
}

export default function removeColumn (db: Base, tableName: string, columnName: string, cb: CallbackFunction) {
  db.all(`PRAGMA table_info(${tableName});`, async (err: Error, rows: Array<Row>) => {
    if (err) {
      cb(err, null)
    } else {
      const sqlNamesWithTypes = rows.filter(row => row.name !== columnName)
        .map(row => `${row.name} ${row.type}`)
        .join(', ')

      const sqlNames = rows.filter(row => row.name !== columnName)
        .map(row => row.name)
        .join(', ')

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
      cb(null, null)
    }
  })
}
