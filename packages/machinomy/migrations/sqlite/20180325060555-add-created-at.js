'use strict';

var dbm;
var type;
var seed;

/**
  * We receive the dbmigrate dependency from dbmigrate initially.
  * This enables us to not have to rely on NODE_PATH.
  */
exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function(db) {
  return db.addColumn('payment', 'createdAt', {
    type: 'bigint'
  });
};

exports.down = function(db, cb) {
  removeColumn(db, 'payment', 'createdAt', cb)
};

function removeColumn(db, tableName, columnName, cb) {
  db.all(`PRAGMA table_info(${tableName});`, async (err, rows) => {
    const sqlNamesWithTypes = rows.filter((element) => {
      return element.name !== columnName
    }).map((element) => {
      return `${element.name} ${element.type}`
    }).join(', ')

    const sqlNames = rows.filter((element) => {
      return element.name !== columnName
    }).map((element) => {
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
  })
}

exports._meta = {
  "version": 1
};
