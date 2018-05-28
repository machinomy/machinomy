import Payment from '../payment'
import ChannelId from '../ChannelId'

export default interface IPaymentsDatabase {
  save (token: string, payment: Payment): Promise<void>
  firstMaximum (channelId: ChannelId | string): Promise<Payment | null>
  findByToken (token: string): Promise<Payment | null>
}
