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

exports.up = function(db, callback) {
  db.createTable('token', {
    token: 'string',
    kind: 'string',
    channelId: {
      type: 'string',
      notNull: true,
      foreignKey: {
        name: 'tokens_channel_id_fk',
        table: 'channel',
        mapping: 'channelId',
        rules: {
          onDelete: 'CASCADE'
        }
      }
    }
  }, callback)
};

exports.down = function(db, callback) {
  db.dropTable('tokens', callback);
};

exports._meta = {
  "version": 1
};
