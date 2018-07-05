import * as debug from 'debug'

export function log (namespace: string): debug.IDebugger {
  return debug(`machinomy:${namespace}`)
}
