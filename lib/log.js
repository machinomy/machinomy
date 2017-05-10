'use strict'

const logger = require('loglevel')

let _window = {}
if (typeof window !== 'undefined') {
  _window = window
} else if (typeof global !== 'undefined') {
  _window = global
}

const LOGLEVEL = _window.LOGLEVEL || _window.LOG_LEVEL || process.env.LOGLEVEL || process.env.LOG_LEVEL || 'error'
logger.setLevel(LOGLEVEL)

module.exports = {
  debug: logger.debug,
  info: logger.info,
  warn: logger.warn,
  error: logger.error
}
