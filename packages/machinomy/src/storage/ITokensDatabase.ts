import ChannelId from '../ChannelId'

export default interface ITokensDatabase {
  save (token: string, channelId: ChannelId | string): Promise<void>
  isPresent (token: string): Promise<boolean>
}
