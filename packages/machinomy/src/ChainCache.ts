import { ChannelState } from './ChannelState'
import BigNumber from 'bignumber.js'

export default class ChainCache {
  refreshDatetime: Date
  cachePeriod: Date
  state: ChannelState
  value: BigNumber
  settlementPeriod: BigNumber

  constructor (chainCachePeriod: number | undefined) {
    this.refreshDatetime = new Date()
    this.cachePeriod = new Date(chainCachePeriod ? chainCachePeriod : 30 * 60 * 1000)
    this.value = new BigNumber(-1)
    this.state = ChannelState.Impossible
    this.settlementPeriod = new BigNumber(-1)
  }

  isStale (): boolean {
    const diff = Math.abs(Date.now().valueOf() - this.refreshDatetime.valueOf())
    return this.state === ChannelState.Impossible || diff > this.cachePeriod.valueOf()
  }

  getState (): ChannelState | undefined {
    return this.state
  }

  getValue (): BigNumber {
    return this.value
  }

  getSettlementPeriod (): BigNumber {
    return this.settlementPeriod
  }

  setData (state: ChannelState, value: BigNumber, settlementPeriod: BigNumber): void {
    this.refreshDatetime = new Date()
    this.state = state
    this.value = value
    this.settlementPeriod = settlementPeriod
  }
}
