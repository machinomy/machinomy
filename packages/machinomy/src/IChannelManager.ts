import Payment from './payment'
import * as BigNumber from 'bignumber.js'
import ChannelId from './ChannelId'
import { EventEmitter } from 'events'
import { TransactionResult } from 'truffle-contract'
import { PaymentChannel } from './PaymentChannel'

export default interface IChannelManager extends EventEmitter {
  openChannel (sender: string, receiver: string, amount: BigNumber.BigNumber, minDepositAmount?: BigNumber.BigNumber, channelId?: ChannelId | string, tokenContract?: string): Promise<PaymentChannel>
  closeChannel (channelId: string | ChannelId): Promise<TransactionResult>
  deposit (channelId: string, value: BigNumber.BigNumber): Promise<TransactionResult>
  nextPayment (channelId: string | ChannelId, amount: BigNumber.BigNumber, meta: string): Promise<Payment>
  spendChannel (payment: Payment): Promise<Payment>
  acceptPayment (payment: Payment): Promise<string>
  requireOpenChannel (sender: string, receiver: string, amount: BigNumber.BigNumber, minDepositAmount?: BigNumber.BigNumber, tokenContract?: string): Promise<PaymentChannel>
  channels (): Promise<PaymentChannel[]>
  openChannels (): Promise<PaymentChannel[]>
  settlingChannels (): Promise<PaymentChannel[]>
  channelById (channelId: ChannelId | string): Promise<PaymentChannel | null>
  verifyToken (token: string): Promise<boolean>
}
