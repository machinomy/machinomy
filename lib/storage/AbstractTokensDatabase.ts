import ITokensDatabase from './ITokensDatabase'
import { namespaced } from '../util/namespaced'
import IEngine from './IEngine'
import ChannelId from '../ChannelId'

export default abstract class AbstractTokensDatabase<T extends IEngine> implements ITokensDatabase {
  kind: string
  engine: T

  constructor (engine: T, namespace: string | null) {
    this.kind = namespaced(namespace, 'token')
    this.engine = engine
  }

  abstract save (token: string, channelId: ChannelId | string): Promise<void>

  abstract isPresent (token: string): Promise<boolean>
}
