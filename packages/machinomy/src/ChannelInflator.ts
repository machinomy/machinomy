import ChannelEthContract from './ChannelEthContract'
import ChannelTokenContract from './ChannelTokenContract'
import { PaymentChannel, PaymentChannelJSON } from './PaymentChannel'
import { ChannelState } from './ChannelState'

export default class ChannelInflator {
  channelEthContract: ChannelEthContract
  channelTokenContract: ChannelTokenContract

  constructor (channelEthContract: ChannelEthContract, channelTokenContract: ChannelTokenContract) {
    this.channelEthContract = channelEthContract
    this.channelTokenContract = channelTokenContract
  }

  static isTokenContractDefined (tokenContract: string | undefined): boolean {
    // tslint:disable-next-line:strict-type-predicates
    return tokenContract !== undefined && tokenContract !== null && tokenContract.startsWith('0x') && parseInt(tokenContract, 16) !== 0
  }

  async inflate (paymentChannelJSON: PaymentChannelJSON): Promise<PaymentChannel | null> {
    const tokenContract = paymentChannelJSON.tokenContract
    const channelId = paymentChannelJSON.channelId
    const contract = this.actualContract(tokenContract)
    const state = await contract.getState(channelId)
    const channel = await contract.channelById(channelId)
    if (channel) {
      let value = channel[2]

      return new PaymentChannel(
        paymentChannelJSON.sender,
        paymentChannelJSON.receiver,
        paymentChannelJSON.channelId,
        value,
        paymentChannelJSON.spent,
        state === ChannelState.Impossible ? ChannelState.Settled : state,
        paymentChannelJSON.tokenContract
      )
    } else {
      return null
    }
  }

  actualContract (tokenContract?: string): ChannelEthContract | ChannelTokenContract {
    if (ChannelInflator.isTokenContractDefined(tokenContract)) {
      return this.channelTokenContract
    } else {
      return this.channelEthContract
    }
  }
}
