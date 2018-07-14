import ChannelEthContract from './ChannelEthContract'
import ChannelTokenContract from './ChannelTokenContract'
import { PaymentChannel, PaymentChannelJSON } from './PaymentChannel'

export default class ChannelInflator {
  channelEthContract: ChannelEthContract
  channelTokenContract: ChannelTokenContract

  constructor (channelEthContract: ChannelEthContract, channelTokenContract: ChannelTokenContract) {
    this.channelEthContract = channelEthContract
    this.channelTokenContract = channelTokenContract
  }

  async inflate (paymentChannelJSON: PaymentChannelJSON): Promise<PaymentChannel> {
    const tokenContract = paymentChannelJSON.contractAddress
    const contract = this.actualContract(tokenContract)
    const state = await contract.getState(paymentChannelJSON.channelId)
    const channel = await contract.channelById(paymentChannelJSON.channelId)
    const value = channel[2]

    return new PaymentChannel(
      paymentChannelJSON.sender,
      paymentChannelJSON.receiver,
      paymentChannelJSON.channelId,
      value,
      paymentChannelJSON.spent,
      state === -1 ? 2 : state,
      paymentChannelJSON.contractAddress
    )
  }

  actualContract (tokenContract?: string): ChannelEthContract | ChannelTokenContract {
    if (this.isTokenContractDefined(tokenContract)) {
      return this.channelTokenContract
    } else {
      return this.channelEthContract
    }
  }

  isTokenContractDefined (tokenContract: string | undefined): boolean {
    return tokenContract !== undefined && tokenContract.startsWith('0x') && parseInt(tokenContract, 16) !== 0
  }
}
