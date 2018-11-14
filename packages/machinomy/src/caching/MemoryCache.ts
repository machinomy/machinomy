class Entry<A> {
  readonly validUntil: number
  readonly value: A

  constructor (ttl: number, value: A) {
    this.validUntil = Date.now() + ttl
    this.value = value
  }

  isLive (): boolean {
    return Date.now() <= this.validUntil
  }
}

export default class MemoryCache<A> {
  private readonly ttl: number
  private readonly entries: Map<string, Entry<A>>

  constructor (ttl: number) {
    this.ttl = ttl
    this.entries = new Map()
  }

  async get (channelId: string): Promise<A | undefined> {
    const entry = this.entries.get(channelId)
    if (entry && entry.isLive()) {
      return entry.value
    } else {
      this.entries.delete(channelId)
      return
    }
  }

  async set (channelId: string, body: A): Promise<void> {
    const entry = new Entry(this.ttl, body)
    this.entries.set(channelId, entry)
  }
}
