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

exports.down = function(db) {
  // temporary disabled because of 'throw new Error('not implemented')' in db-migrate-sqlite
  // return db.removeColumn('payment', 'createdAt');
};

exports._meta = {
  "version": 1
};
