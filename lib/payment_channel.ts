import Payment from './payment'
import * as BigNumber from 'bignumber.js'
import Serde from './serde'

export interface PaymentChannelJSON {
  sender: string
  receiver: string
  channelId: string
  value: BigNumber.BigNumber
  spent: BigNumber.BigNumber
  state: number
  contractAddress: string | undefined
}

export interface SerializedPaymentChannel {
  state: number,
  spent: string,
  value: string,
  channelId: string,
  receiver: string,
  sender: string,
  contractAddress: string | undefined
}

/**
 * The Payment Channel
 */
export class PaymentChannel {
  sender: string
  receiver: string
  channelId: string
  value: BigNumber.BigNumber
  spent: BigNumber.BigNumber
  state: number
  contractAddress: string | undefined

  /**
   * @param sender      Ethereum address of the client.
   * @param receiver    Ethereum address of the server.
   * @param channelId   Identifier of the channel.
   * @param value       Total value of the channel.
   * @param spent       Value sent by {sender} to {receiver}.
   * @param state       0 - 'open', 1 - 'settling', 2 - 'settled'
   */
  constructor (sender: string, receiver: string, channelId: string, value: BigNumber.BigNumber, spent: BigNumber.BigNumber, state: number = 0, contractAddress: string | undefined) { // FIXME remove contract parameter
    this.sender = sender
    this.receiver = receiver
    this.channelId = channelId
    this.value = new BigNumber.BigNumber(value.toString())
    this.spent = new BigNumber.BigNumber(spent.toString())
    this.state = state || 0
    this.contractAddress = contractAddress
  }

  static fromPayment (payment: Payment): PaymentChannel {
    return new PaymentChannel(payment.sender, payment.receiver, payment.channelId, payment.channelValue, payment.value, undefined, payment.contractAddress)
  }

  static fromDocument (document: PaymentChannelJSON): PaymentChannel {
    return new PaymentChannel(
      document.sender,
      document.receiver,
      document.channelId,
      document.value,
      document.spent,
      document.state,
      document.contractAddress
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
      contractAddress: obj.contractAddress
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
      data.contractAddress
    )
  }
}
