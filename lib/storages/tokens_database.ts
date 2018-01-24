import Engine, { EngineMongo, EngineNedb, EnginePostgres } from '../engines/engine'
import { ChannelId } from '../channel'
import { namespaced } from '../util/namespaced'
import pify from '../util/pify'
import serviceRegistry from '../container'

export default interface TokensDatabase {
  save (token: string, channelId: ChannelId | string): Promise<void>

  isPresent (token: string): Promise<boolean>
}

export abstract class AbstractTokensDatabase<T extends Engine> implements TokensDatabase {
  kind: string

  engine: T

  constructor (engine: T, namespace: string | null) {
    this.kind = namespaced(namespace, 'token')
    this.engine = engine
  }

  abstract save (token: string, channelId: ChannelId | string): Promise<void>

  abstract isPresent (token: string): Promise<boolean>
}

/**
 * Database layer for tokens.
 */
export class MongoTokensDatabase extends AbstractTokensDatabase<EngineMongo> {
  save (token: string, channelId: ChannelId | string): Promise<void> {
    return this.engine.exec((client: any) => {
      const tokenDocument = {
        kind: this.kind,
        token: token.toString(),
        channelId: channelId.toString()
      }

      return pify((cb: Function) => client.collection('token').insert(tokenDocument, cb))
    })
  }

  isPresent (token: string): Promise<boolean> {
    return this.engine.exec((client: any) => {
      const query = {kind: this.kind, token: token}
      return pify((cb: Function) => client.collection('token').count(query, {limit: 1}, cb))
    }).then((res: number) => (res > 0))
  }
}

export class NedbTokensDatabase extends AbstractTokensDatabase<EngineNedb> {
  save (token: string, channelId: ChannelId | string): Promise<void> {
    return this.engine.exec((client: any) => {
      const tokenDocument = {
        kind: this.kind,
        token: token.toString(),
        channelId: channelId.toString()
      }

      return pify((cb: Function) => client.insert(tokenDocument, cb))
    })
  }

  isPresent (token: string): Promise<boolean> {
    return this.engine.exec((client: any) => {
      const query = {kind: this.kind, token: token}
      return pify((cb: Function) => client.count(query, cb))
    }).then((res: number) => (res > 0))
  }
}

export class PostgresTokensDatabase extends AbstractTokensDatabase<EnginePostgres> {
  save (token: string, channelId: ChannelId | string): Promise<void> {
    return this.engine.exec((client: any) => client.query(
      'INSERT INTO token(token, "channelId", kind) VALUES ($1, $2, $3)',
      [
        token,
        channelId.toString(),
        this.kind
      ]
    ))
  }

  isPresent (token: string): Promise<boolean> {
    return this.engine.exec((client: any) => client.query(
      'SELECT COUNT(*) as count FROM token WHERE token=$1',
      [
        token
      ]
    )).then((res: any) => (res.rows[0].count > 0))
  }
}

serviceRegistry.bind('TokensDatabase', (engine: Engine, namespace: string) => {
  if (engine instanceof EngineMongo) {
    return new MongoTokensDatabase(engine, namespace)
  }

  if (engine instanceof EnginePostgres) {
    return new PostgresTokensDatabase(engine, namespace)
  }

  if (engine instanceof EngineNedb) {
    return new NedbTokensDatabase(engine, namespace)
  }

  throw new Error('Invalid engine.')
}, ['Engine', 'namespace'])
