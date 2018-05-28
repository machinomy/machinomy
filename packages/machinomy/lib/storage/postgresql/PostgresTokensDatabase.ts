import ChannelId from '../../ChannelId'
import EnginePostgres from './EnginePostgres'
import AbstractTokensDatabase from '../AbstractTokensDatabase'

export default class PostgresTokensDatabase extends AbstractTokensDatabase<EnginePostgres> {
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
