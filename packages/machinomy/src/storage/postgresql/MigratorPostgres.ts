import IMigrator from '../IMigrator'
import EnginePostgres from './EnginePostgres'

export default class MigratorPostgres implements IMigrator {
  engine: EnginePostgres

  constructor (engine: EnginePostgres) {
    this.engine = engine
  }

  isLatest (): Promise<boolean> {
    return new Promise(async (resolve) => {
      resolve(true)
    })
  }

  sync (n?: string): Promise<void> {
    return new Promise(async (resolve) => {
      resolve()
    })
  }

  async getCommonIndex (): Promise<number> {
    return Promise.resolve(-1)
  }

  retrieveUpMigrationList (): Promise<string[]> {
    return new Promise((resolve) => {
      resolve([])
    })
  }

  retrieveInFolderMigrationList (): Promise<string[]> {
    return new Promise(async (resolve) => {
      resolve([])
    })
  }
}
