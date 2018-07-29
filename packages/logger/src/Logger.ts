import * as d from 'debug'
import Levels from './Levels'

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
