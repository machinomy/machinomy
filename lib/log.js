'use strict'

const logger = require('loglevel')

let _global = window || global || {}

const LOGLEVEL = _global.LOGLEVEL || _global.LOG_LEVEL || process.env.LOGLEVEL || process.env.LOG_LEVEL || 'error'
logger.setLevel(LOGLEVEL)

module.exports = {
  debug: logger.debug,
  info: logger.info,
  warn: logger.warn,
  error: logger.error
}
