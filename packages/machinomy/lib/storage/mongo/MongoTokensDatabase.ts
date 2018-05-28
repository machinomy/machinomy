import EngineMongo from './EngineMongo'
import pify from '../../util/pify'
import AbstractTokensDatabase from '../AbstractTokensDatabase'
import ChannelId from '../../ChannelId'

export default class MongoTokensDatabase extends AbstractTokensDatabase<EngineMongo> {
  async save (token: string, channelId: ChannelId | string): Promise<void> {
    await this.engine.exec(client => {
      const tokenDocument = {
        kind: this.kind,
        token: token.toString(),
        channelId: channelId.toString()
      }

      return pify((cb: (err: Error) => void) => client.collection('token').insert(tokenDocument, cb))
    })
  }

  async isPresent (token: string): Promise<boolean> {
    const query = { kind: this.kind, token: token }
    let count = await this.engine.exec(client => {
      return pify<number>((cb: (err: Error, n: number) => void) => {
        client.collection('token').count(query, { limit: 1 }, cb)
      })
    })
    return count > 0
  }
}
