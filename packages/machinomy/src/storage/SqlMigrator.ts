import * as DBMigrate from 'db-migrate'
import Logger from '@machinomy/logger'
import * as files from '../util/files'
import IMigrator from './IMigrator'
import Indexed from '../util/Indexed'

export default abstract class SqlMigrator implements IMigrator {
  dbmigrate: DBMigrate.DBMigrate
  migrationsPath: string
  log: Logger

  protected constructor (log: Logger, config: DBMigrate.InstanceOptions) {
    this.log = log
    log.debug('migrator config %o', config)
    this.migrationsPath = (config.cmdOptions as Indexed<string>)['migrations-dir']
    this.dbmigrate = DBMigrate.getInstance(true, config)
  }

  async isLatest (): Promise<boolean> {
    let r = await this.dbmigrate.check()
    r ? this.log.info('Latest migration is applied') : this.log.info('Have migrations to be applied')
    return this.dbmigrate.check()
  }

  async sync (n?: string): Promise<void> {
    let destination = n || await this.lastMigrationNumber()
    this.log.info('Syncing migrations till %s', destination)
    return this.dbmigrate.sync(destination)
  }

  async lastMigrationNumber (): Promise<string | undefined> {
    let allFiles = await files.readdir(this.migrationsPath)
    let migrations = allFiles.reduce((acc, filename) => {
      let match = filename.match(/^(\d+)[\w-]+\.[jt]s$/)
      return match ? acc.concat([match[1]]) : acc
    }, [] as Array<string>).sort()
    return migrations[migrations.length - 1]
  }
}
