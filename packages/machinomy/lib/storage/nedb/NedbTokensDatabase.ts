import AbstractTokensDatabase from '../AbstractTokensDatabase'
import EngineNedb from './EngineNedb'
import ChannelId from '../../ChannelId'

export default class NedbTokensDatabase extends AbstractTokensDatabase<EngineNedb> {
  async save (token: string, channelId: ChannelId | string): Promise<void> {
    const tokenDocument = {
      kind: this.kind,
      token: token.toString(),
      channelId: channelId.toString()
    }
    await this.engine.exec(async client => {
      await client.insert(tokenDocument)
    })
  }

  async isPresent (token: string): Promise<boolean> {
    const query = { kind: this.kind, token: token }
    return this.engine.exec(async client => {
      let count = await client.count(query)
      return count > 0
    })
  }
}
