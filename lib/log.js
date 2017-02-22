'use strict'

import winston from "winston"

winston.loggers.add('machinomy', {
  console: {
    level: process.env.LOGLEVEL || process.env.LOG_LEVEL || 'info',
    colorize: true
  }
})

const logger = winston.loggers.get('machinomy')

module.exports = {
  error: logger.error,
  warn: logger.warn,
  info: logger.info,
  verbose: logger.verbose,
  debug: logger.debug
}
