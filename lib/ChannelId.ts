import * as uuid from 'uuid'

export default class ChannelId {
  id: Buffer

  constructor (buffer: Buffer) {
    this.id = buffer
  }

  static random (): ChannelId {
    let id = uuid.v4().replace(/-/g, '')
    return this.build(id)
  }

  static build (something: string | Buffer | ChannelId): ChannelId {
    if (typeof something === 'string') {
      const noPrefix = something.replace('0x', '')
      const buffer = Buffer.from(noPrefix, 'HEX')
      return new ChannelId(buffer)
    } else if (something instanceof Buffer) {
      return new ChannelId(something)
    } else if (something instanceof ChannelId) {
      return something
    } else {
      throw new Error(`Can not transform ${something} to ChannelId`)
    }
  }

  toString () {
    return '0x' + this.id.toString('hex')
  }
}
