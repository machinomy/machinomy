import { BigNumber } from 'bignumber.js'

export default interface IPaymentChannel {
  sender: string
  receiver: string
  channelId: string
  value: BigNumber
  spent: BigNumber
  state: number
  tokenContract: string
}
