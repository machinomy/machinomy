import * as d from 'debug'
import Levels from './Levels'
const LogDNA = require('logdna')

export default class Logger {
  private readonly _fatal: d.IDebugger
  private readonly _error: d.IDebugger
  private readonly _warn: d.IDebugger
  private readonly _info: d.IDebugger
  private readonly _debug: d.IDebugger
  private readonly _trace: d.IDebugger
  private readonly namespace: string
  private readonly loggerDNA: any

  constructor (namespace: string, logDNAKey?: string, logDNAOptions?: any) {
    let levels = new Levels(namespace)
    this._fatal = levels.fatal
    this._error = levels.error
    this._warn = levels.warn
    this._info = levels.info
    this._debug = levels.debug
    this._trace = levels.trace
    this.namespace = namespace
    if (logDNAKey && logDNAKey.length > 0) {
      if (!logDNAOptions) {
        logDNAOptions = {}
      }
      if (!logDNAOptions.hasOwnProperty('hostname')) {
        logDNAOptions = { ...logDNAOptions, hostname: 'defaultHostname' }
      }
      this.loggerDNA = LogDNA.setupDefaultLogger(logDNAKey, logDNAOptions)
    }
  }

  fatal (formatter: any, ...args: any[]) {
    this._fatal(formatter, args)
    if (this.loggerDNA) {
      this.loggerDNA.fatal(`fatal:${this.namespace} ${formatter}`)
    }
  }

  error (formatter: any, ...args: any[]) {
    this._error(formatter, args)
    if (this.loggerDNA) {
      this.loggerDNA.error(`error:${this.namespace} ${formatter}`)
    }
  }

  warn (formatter: any, ...args: any[]) {
    this._warn(formatter, args)
    if (this.loggerDNA) {
      this.loggerDNA.warn(`warn:${this.namespace} ${formatter}`)
    }
  }

  info (formatter: any, ...args: any[]) {
    this._info(formatter, args)
    if (this.loggerDNA) {
      this.loggerDNA.info(`info:${this.namespace} ${formatter}`)
    }
  }

  debug (formatter: any, ...args: any[]) {
    this._debug(formatter, args)
    if (this.loggerDNA) {
      this.loggerDNA.debug(`debug:${this.namespace} ${formatter}`)
    }
  }

  trace (formatter: any, ...args: any[]) {
    this._trace(formatter, args)
    if (this.loggerDNA) {
      this.loggerDNA.trace(`trace:${this.namespace} ${formatter}`)
    }
  }
}
