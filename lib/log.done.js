'use strict'

const logger = require('loglevel')

let container = {}
if (typeof window !== 'undefined') {
  container = window
} else if (typeof global !== 'undefined') {
  container = global
}

const LOGLEVEL = container.LOGLEVEL || container.LOG_LEVEL || process.env.LOGLEVEL || process.env.LOG_LEVEL || 'error'
logger.setLevel(LOGLEVEL)

module.exports = {
  debug: logger.debug,
  info: logger.info,
  warn: logger.warn,
  error: logger.error
}
