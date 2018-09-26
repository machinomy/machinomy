import Serde from './Serde'
import * as BigNumber from 'bignumber.js'
import { IvalidTypeError } from './Exceptions'
import Signature from './Signature'

export class RemoteChannelInfo {
  channelId: string
  spent: BigNumber.BigNumber
  sign: Signature

  constructor (channelId: string, spent: BigNumber.BigNumber, sign: Signature) {
    this.channelId = channelId
    this.spent = spent
    this.sign = sign
  }
}

export class RemoteChannelInfoSerde implements Serde<RemoteChannelInfo> {
  static instance: RemoteChannelInfoSerde = new RemoteChannelInfoSerde()

  serialize (obj: RemoteChannelInfo): object {
    return {
      channelId: obj.channelId,
      spent: obj.spent.toString(),
      sign: obj.sign.toString()
    }
  }

  deserialize (data: any): RemoteChannelInfo {
    if (!data.channelId) {
      throw new IvalidTypeError(RemoteChannelInfo.name, 'channelId')
    }
    if (!data.spent) {
      throw new IvalidTypeError(RemoteChannelInfo.name, 'spent')
    }
    if (!data.sign) {
      throw new IvalidTypeError(RemoteChannelInfo.name, 'sign')
    }

    return {
      channelId: data.channelId,
      spent: new BigNumber.BigNumber(data.spent),
      sign: Signature.fromRpcSig(data.sign)
    }
  }
}

export class RemoteChannelInfos {
  channels: RemoteChannelInfo[]
  constructor (channels: RemoteChannelInfo[]) {
    this.channels = channels
  }
}

export class RemoteChannelInfosSerde implements Serde<RemoteChannelInfos> {
  static instance: RemoteChannelInfosSerde = new RemoteChannelInfosSerde()

  serialize (obj: RemoteChannelInfos): object {
    return obj.channels.map(channel => RemoteChannelInfoSerde.instance.serialize(channel))
  }

  deserialize (data: any): RemoteChannelInfos {
    if (!data.map) {
      throw new IvalidTypeError(RemoteChannelInfosSerde.name, 'map')
    }
    return {
      channels: data.map((channel: any) => RemoteChannelInfoSerde.instance.deserialize(channel))
    }
  }
}
