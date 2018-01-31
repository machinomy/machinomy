import * as debug from 'debug'

export default function log (namespace: string): debug.IDebugger {
  return debug(`machinomy:${namespace}`)
}
