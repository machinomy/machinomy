import Engine from '../engines/engine'
import { ChannelId } from '../channel'

const namespaced = (namespace: string|null|undefined, kind: string): string => {
  let result = kind
  if (namespace) {
    result = namespace + ':' + kind
  }
  return result
}

/**
 * Database layer for tokens.
 */
export default class TokensDatabase {
  kind: string
  engine: Engine

  constructor (engine: Engine, namespace: string | null) {
    this.kind = namespaced(namespace, 'token')
    this.engine = engine
  }

  /**
   * Save token for channelId
   */
  save (token: string, channelId: ChannelId|string): Promise<void> {
    let tokenDocument = {
      kind: this.kind,
      token: token.toString(),
      channelId: channelId.toString()
    }
    return this.engine.insert(tokenDocument)
  }

  /**
   * Check if token is stored.
   */
  isPresent (token: string): Promise<boolean> {
    let query = { kind: this.kind, token: token }
    return this.engine.findOne(query).then(document => {
      let result = Boolean(document)
      // log.info(`Token ${token} is present: ${result}`)
      return result
    })
  }
}
