export type Task<T> = () => Promise<T>

export default class Mutex {
  private static DEFAULT_QUEUE = '__MUTEX_DEFAULT_QUEUE'

  private queues = new Map<string, Array<Task<any>>>()

  private busyQueues = new Map<string, true>()

  synchronize<T> (task: Task<T>): Promise<T> {
    return this.synchronizeOn(Mutex.DEFAULT_QUEUE, task)
  }

  async synchronizeOn<T> (key: string, task: Task<T>): Promise<T> {
    return new Promise<T>(async (resolve, reject) => {
      let present = this.queues.get(key) || []
      present.push(() => task().then(resolve).catch(reject))
      this.queues.set(key, present)

      if (!this.busyQueues.has(key)) {
        await this.dequeue(key)
      }
    })
  }

  private async dequeue (queueName: string) {
    const next = this.queues.get(queueName)!.shift()

    if (!next) {
      this.busyQueues.delete(queueName)
      this.queues.delete(queueName)
      return
    }

    this.busyQueues.set(queueName, true)
    try {
      await next()
    } finally {
      await this.dequeue(queueName)
    }
  }
}
