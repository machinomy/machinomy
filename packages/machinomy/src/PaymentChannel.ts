import Payment from './payment'
import * as BigNumber from 'bignumber.js'
import Serde from './Serde'
import IPaymentChannel from './IPaymentChannel'

export type PaymentChannelJSON = IPaymentChannel

export interface SerializedPaymentChannel {
  state: number,
  spent: string,
  value: string,
  channelId: string,
  receiver: string,
  sender: string,
  tokenContract?: string
}

/**
 * The Payment Channel
 */
export class PaymentChannel implements IPaymentChannel {
  sender: string
  receiver: string
  channelId: string
  value: BigNumber.BigNumber
  spent: BigNumber.BigNumber
  state: number
  tokenContract: string

  /**
   * @param sender      Ethereum address of the client.
   * @param receiver    Ethereum address of the server.
   * @param channelId   Identifier of the channel.
   * @param value       Total value of the channel.
   * @param spent       Value sent by {sender} to {receiver}.
   * @param state       0 - 'open', 1 - 'settling', 2 - 'settled'
   * @param tokenContract
   */
  constructor (sender: string, receiver: string, channelId: string, value: BigNumber.BigNumber, spent: BigNumber.BigNumber, state: number = 0, tokenContract?: string) {
    this.sender = sender
    this.receiver = receiver
    this.channelId = channelId
    this.value = new BigNumber.BigNumber(value.toString())
    this.spent = new BigNumber.BigNumber(spent.toString())
    this.state = Number(state)
    this.tokenContract = tokenContract || ''
  }

  static fromPayment (payment: Payment): PaymentChannel {
    return new PaymentChannel(payment.sender, payment.receiver, payment.channelId, payment.channelValue, payment.value, undefined, payment.tokenContract || '')
  }

  static fromDocument (document: PaymentChannelJSON): PaymentChannel {
    return new PaymentChannel(
      document.sender,
      document.receiver,
      document.channelId,
      document.value,
      document.spent,
      document.state,
      document.tokenContract
    )
  }
}

export class PaymentChannelSerde implements Serde<PaymentChannel> {
  static instance = new PaymentChannelSerde()

  serialize (obj: PaymentChannel): SerializedPaymentChannel {
    return {
      state: obj.state,
      spent: obj.spent.toString(),
      value: obj.value.toString(),
      channelId: obj.channelId.toString(),
      receiver: obj.receiver,
      sender: obj.sender,
      tokenContract: obj.tokenContract
    }
  }

  deserialize (data: any): PaymentChannel {
    return new PaymentChannel(
      data.sender,
      data.receiver,
      data.channelId,
      data.value,
      data.spent,
      data.state,
      data.tokenContract
    )
  }
}
