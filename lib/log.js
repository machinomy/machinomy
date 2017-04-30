'use strict'

const logger = require('loglevel')

const LOGLEVEL = global.LOGLEVEL || global.LOG_LEVEL || process.env.LOGLEVEL || process.env.LOG_LEVEL || 'error'
logger.setLevel(LOGLEVEL)

module.exports = {
  debug: logger.debug,
  info: logger.info,
  warn: logger.warn,
  error: logger.error
}
