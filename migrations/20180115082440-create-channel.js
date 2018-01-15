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

exports.up = function (db, callback) {
  db.createTable('channel', {
    channelId: {
      type: 'string',
      primaryKey: true
    },
    kind: 'string',
    sender: 'string',
    receiver: 'string',
    value: 'string',
    spent: 'string',
    state: 'smallint',
    contractAddress: 'string'
  }, callback);
};

exports.down = function (db, callback) {
  db.dropTable('payment_channel', callback);
};

exports._meta = {
  "version": 1
};
