import ChainCacheEntry from './ChainCacheEntry'

export default class ChainCache {
  private readonly chainCachePeriod: number | undefined
  private readonly entries: Map<string, ChainCacheEntry>

  constructor (chainCachePeriod: number | undefined) {
    this.chainCachePeriod = chainCachePeriod
    this.entries = new Map()
  }

  cached (channelId: string): ChainCacheEntry {
    if (this.entries.has(channelId) !== true) {
      const chainCacheEntry = new ChainCacheEntry(this.chainCachePeriod)
      this.entries.set(channelId, chainCacheEntry)
    }
    return this.entries.get(channelId)!
  }
}
