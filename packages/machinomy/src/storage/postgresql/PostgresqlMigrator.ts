import { ConnectionString } from 'connection-string'
import Logger from '@machinomy/logger'
import SqlMigrator from '../SqlMigrator'

export function migrationsConfig (connectionUrl: string) {
  let c = new ConnectionString(connectionUrl)
  return {
    cmdOptions: {
      'migrations-dir': './packages/machinomy/lib/storage/postgresql/migrations/'
    },
    config: {
      defaultEnv: 'defaultPg',
      defaultPg: {
        driver: 'pg',
        user: `${c.user}`,
        password: `${c.password}`,
        host: `${c.hostname}`,
        database: `${c.segments![0]}`
      }
    }
  }
}

const log = new Logger('migrator:postgresql')

export default class PostgresqlMigrator extends SqlMigrator {
  constructor (databaseUrl: string) {
    super(log, migrationsConfig(databaseUrl))
  }
}
