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
  return db.runSql(`
    CREATE OR REPLACE FUNCTION validate_payment_increment() RETURNS trigger as $$
    DECLARE
    _last_value NUMERIC(78,0);
    _channel_value NUMERIC(78,0);
    BEGIN
      SELECT INTO _last_value COALESCE(MAX(value), 0) FROM payment WHERE "channelId" = NEW."channelId";
      
      SELECT INTO _channel_value value FROM channel WHERE "channelId" = NEW."channelId";
      
      IF NEW.value != _last_value + NEW.price THEN
        RAISE EXCEPTION 'invalid price increment';
      END IF;
      
      IF NEW.value > _channel_value THEN
        RAISE EXCEPTION 'new value exceeds channel value';
      END IF;
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER validate_payment_increment BEFORE INSERT ON payment FOR EACH ROW EXECUTE PROCEDURE validate_payment_increment();
  `);
};

exports.down = function(db) {
  return db.runSql(`
    DROP TRIGGER validate_payment_increment ON payment;
    DROP FUNCTION validate_payment_increment();
  `);
};

exports._meta = {
  "version": 1
};
