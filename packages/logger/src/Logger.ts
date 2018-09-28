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
        logDNAOptions = { ...logDNAOptions, hostname: '' }
      }
      this.loggerDNA = LogDNA.setupDefaultLogger(logDNAKey, logDNAOptions)
    }
  }

  fatal (formatter: any, ...args: any[]) {
    this._fatal(formatter, ...args)
    if (this.loggerDNA) {
      this.loggerDNA.log(formatter, {
        level: 'Fatal',
        app: '',
        meta: { namespace: this.namespace },
        index_meta: true
      })
    }
  }

  error (formatter: any, ...args: any[]) {
    this._error(formatter, ...args)
    if (this.loggerDNA) {
      this.loggerDNA.log(formatter, {
        level: 'Error',
        app: '',
        meta: { namespace: this.namespace },
        index_meta: true
      })
    }
  }

  warn (formatter: any, ...args: any[]) {
    this._warn(formatter, ...args)
    if (this.loggerDNA) {
      this.loggerDNA.log(formatter, {
        level: 'Warn',
        app: '',
        meta: { namespace: this.namespace },
        index_meta: true
      })
    }
  }

  info (formatter: any, ...args: any[]) {
    this._info(formatter, ...args)
    if (this.loggerDNA) {
      this.loggerDNA.log(formatter, {
        level: 'Info',
        app: '',
        meta: { namespace: this.namespace },
        index_meta: true
      })
    }
  }

  debug (formatter: any, ...args: any[]) {
    this._debug(formatter, ...args)
    if (this.loggerDNA) {
      this.loggerDNA.log(formatter, {
        level: 'Debug',
        app: '',
        meta: { namespace: this.namespace },
        index_meta: true
      })
    }
  }

  trace (formatter: any, ...args: any[]) {
    this._trace(formatter, ...args)
    if (this.loggerDNA) {
      this.loggerDNA.log(formatter, {
        level: 'Trace',
        app: '',
        meta: { namespace: this.namespace },
        index_meta: true
      })
    }
  }
}
