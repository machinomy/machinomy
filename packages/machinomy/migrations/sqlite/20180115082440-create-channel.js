'use strict';

var bigNumberColumn = require('./util/bigNumberColumn');

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

exports.up = function (db, callback) {
  var createTableOptions = {
    columns:
      {
        channelId: {
          type: 'string',
          primaryKey: true
        },
        kind: 'string',
        sender: 'string',
        receiver: 'string',
        value: bigNumberColumn,
        spent: bigNumberColumn,
        state: 'smallint',
        contractAddress: 'string'
      },
    ifNotExists: true
  }
  db.createTable('channel', createTableOptions, callback);
};

exports.down = function (db, callback) {
  db.dropTable('channel', callback);
};

exports._meta = {
  "version": 1
};
