import { ChannelState } from './ChannelState'
import BigNumber from 'bignumber.js'

export default class ChainCacheEntry {
  private _refreshDatetime: Date
  private _cachePeriod: Date
  private _state: ChannelState
  private _value: BigNumber
  private _settlementPeriod: BigNumber

  constructor (chainCachePeriod: number | undefined) {
    this._refreshDatetime = new Date()
    this._cachePeriod = new Date(chainCachePeriod ? chainCachePeriod : 30 * 60 * 1000)
    this._value = new BigNumber(-1)
    this._state = ChannelState.Impossible
    this._settlementPeriod = new BigNumber(-1)
  }

  isStale (): boolean {
    const diff = Math.abs(Date.now().valueOf() - this._refreshDatetime.valueOf())
    return this._state === ChannelState.Impossible || diff > this._cachePeriod.valueOf()
  }

  state (): ChannelState {
    return this._state
  }

  value (): BigNumber {
    return this._value
  }

  settlementPeriod (): BigNumber {
    return this._settlementPeriod
  }

  setData (state: ChannelState, value: BigNumber, settlementPeriod: BigNumber): void {
    this._refreshDatetime = new Date()
    this._state = state
    this._value = value
    this._settlementPeriod = settlementPeriod
  }
}
