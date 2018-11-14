import ChainCacheEntry from './ChainCacheEntry'

const DEFAULT_TTL = 60 * 60 * 1000 // 1 Hour

export default class ChainCache {
  private readonly chainCachePeriod: number
  private readonly entries: Map<string, ChainCacheEntry>

  constructor (chainCachePeriod: number | undefined) {
    this.chainCachePeriod = chainCachePeriod || DEFAULT_TTL
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
