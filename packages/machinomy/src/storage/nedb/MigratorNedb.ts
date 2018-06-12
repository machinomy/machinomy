import IMigrator from '../IMigrator'
import EngineNedb from './EngineNedb'

export default class MigratorNedb implements IMigrator {
  engine: EngineNedb

  constructor (engine: EngineNedb) {
    this.engine = engine
  }

  isLatest (): Promise<boolean> {
    return new Promise((resolve) => {
      resolve(true)
    })
  }

  sync (n?: string): Promise<void> {
    return new Promise((resolve) => {
      resolve()
    })
  }
}
