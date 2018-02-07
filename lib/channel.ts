import { PaymentChannelJSON, PaymentChannel } from './payment_channel'
export { PaymentChannelJSON, PaymentChannel }

export class ChannelId {
  id: Buffer

  constructor (buffer: Buffer) {
    this.id = buffer
  }

  toString () {
    return '0x' + this.id.toString('hex')
  }
}

export function id (something: string | Buffer | ChannelId): ChannelId {
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
