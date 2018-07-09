import * as d from 'debug'

class Levels {
  namespace: string
  _fatal?: d.IDebugger
  _error?: d.IDebugger
  _warn?: d.IDebugger
  _info?: d.IDebugger
  _debug?: d.IDebugger
  _trace?: d.IDebugger

  constructor (namespace: string) {
    this.namespace = namespace
  }

  get fatal (): d.IDebugger {
    if (!this._fatal) {
      this._fatal = d(`fatal:${this.namespace}`)
    }
    return this._fatal
  }

  get error () {
    if (!this._error) {
      this._error = d(`error:${this.namespace}`)
    }
    return this._error
  }

  get warn () {
    if (!this._warn) {
      this._warn = d(`warn:${this.namespace}`)
    }
    return this._warn
  }

  get info () {
    if (!this._info) {
      this._info = d(`info:${this.namespace}`)
    }
    return this._info
  }

  get debug () {
    if (!this._debug) {
      this._debug = d(`debug:${this.namespace}`)
    }
    return this._debug
  }

  get trace () {
    if (!this._trace) {
      this._trace = d(`trace:${this.namespace}`)
    }
    return this._trace
  }
}

export default class Logger {
  fatal: d.IDebugger
  error: d.IDebugger
  warn: d.IDebugger
  info: d.IDebugger
  debug: d.IDebugger
  trace: d.IDebugger

  constructor (namespace: string) {
    let levels = new Levels(namespace)
    this.fatal = levels.fatal
    this.error = levels.error
    this.warn = levels.warn
    this.info = levels.info
    this.debug = levels.debug
    this.trace = levels.trace
  }
}
