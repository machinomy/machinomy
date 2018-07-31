import { ConnectionString } from 'connection-string'

export default function migrationsConfig (connectionUrl: string) {
  let c = new ConnectionString(connectionUrl)
  return {
    cmdOptions: {
      'migrations-dir': './packages/machinomy/migrations/postgresql'
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
