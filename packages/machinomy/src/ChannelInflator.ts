import ChainCache from './ChainCache'
import ChannelEthContract from './ChannelEthContract'
import ChannelTokenContract from './ChannelTokenContract'
import { PaymentChannel, PaymentChannelJSON } from './PaymentChannel'
import { ChannelState } from './ChannelState'

export default class ChannelInflator {
  channelEthContract: ChannelEthContract
  channelTokenContract: ChannelTokenContract
  chainCache: ChainCache

  constructor (channelEthContract: ChannelEthContract, channelTokenContract: ChannelTokenContract, chainCache: ChainCache) {
    this.channelEthContract = channelEthContract
    this.channelTokenContract = channelTokenContract
    this.chainCache = chainCache
  }

  static isTokenContractDefined (tokenContract: string | undefined): boolean {
    // tslint:disable-next-line:strict-type-predicates
    return tokenContract !== undefined && tokenContract !== null && tokenContract.startsWith('0x') && parseInt(tokenContract, 16) !== 0
  }

  async inflate (paymentChannelJSON: PaymentChannelJSON): Promise<PaymentChannel> {
    let value
    let state
    if (this.chainCache.cached(paymentChannelJSON.channelId).isStale()) {
      const tokenContract = paymentChannelJSON.tokenContract
      const contract = this.actualContract(tokenContract)
      state = await contract.getState(paymentChannelJSON.channelId)
      const channel = await contract.channelById(paymentChannelJSON.channelId)
      value = channel[2]
      const settlementPeriod = await contract.getSettlementPeriod(paymentChannelJSON.channelId)
      this.chainCache.cached(paymentChannelJSON.channelId).setData(state, value, settlementPeriod)
    } else {
      state = this.chainCache.cached(paymentChannelJSON.channelId).state()
      value = this.chainCache.cached(paymentChannelJSON.channelId).value()
    }

    return new PaymentChannel(
      paymentChannelJSON.sender,
      paymentChannelJSON.receiver,
      paymentChannelJSON.channelId,
      value,
      paymentChannelJSON.spent,
      state === ChannelState.Impossible ? ChannelState.Settled : state,
      paymentChannelJSON.tokenContract
    )
  }

  actualContract (tokenContract?: string): ChannelEthContract | ChannelTokenContract {
    if (ChannelInflator.isTokenContractDefined(tokenContract)) {
      return this.channelTokenContract
    } else {
      return this.channelEthContract
    }
  }
}
