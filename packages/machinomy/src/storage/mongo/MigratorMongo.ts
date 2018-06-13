import IMigrator from '../IMigrator'
import EngineMongo from './EngineMongo'

export default class MigratorMongo implements IMigrator {
  engine: EngineMongo

  constructor (engine: EngineMongo) {
    this.engine = engine
  }

  isLatest (): Promise<boolean> {
    return new Promise((resolve) => {
      return resolve(true)
    })
  }

  sync (n?: string): Promise<void> {
    return new Promise((resolve) => {
      return resolve()
    })
  }
}
