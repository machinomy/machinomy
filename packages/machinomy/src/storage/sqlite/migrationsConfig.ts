import { ConnectionString } from 'connection-string'

export default function migrationsConfig (connectionUrl: string) {
  let c = new ConnectionString(connectionUrl)
  let segments = c.segments || []
  let filename = c.hostname + '/' + segments.join('/')
  return {
    cmdOptions: {
      'migrations-dir': './packages/machinomy/lib/storage/sqlite/migrations/'
    },
    config: {
      defaultEnv: 'defaultSqlite',
      defaultSqlite: {
        driver: 'sqlite3',
        filename: filename
      }
    }
  }
}
