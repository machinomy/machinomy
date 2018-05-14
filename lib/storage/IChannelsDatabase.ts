import * as BigNumber from 'bignumber.js'
import { PaymentChannel } from '../PaymentChannel'
import ChannelId from '../ChannelId'

export default interface IChannelsDatabase {
  save (paymentChannel: PaymentChannel): Promise<void>
  saveOrUpdate (paymentChannel: PaymentChannel): Promise<void>
  deposit (channelId: ChannelId | string, value: BigNumber.BigNumber): Promise<void>
  firstById (channelId: ChannelId | string): Promise<PaymentChannel | null>
  spend (channelId: ChannelId | string, spent: BigNumber.BigNumber): Promise<void>
  all (): Promise<Array<PaymentChannel>>
  allOpen (): Promise<PaymentChannel[]>
  allSettling (): Promise<PaymentChannel[]>
  findUsable (sender: string, receiver: string, amount: BigNumber.BigNumber): Promise<PaymentChannel | null>
  findBySenderReceiver (sender: string, receiver: string): Promise<Array<PaymentChannel>>
  findBySenderReceiverChannelId (sender: string, receiver: string, channelId: ChannelId | string): Promise<PaymentChannel | null>
  updateState (channelId: ChannelId | string, state: number): Promise<void>
}
