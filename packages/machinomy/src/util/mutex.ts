export type Task<T> = () => Promise<T>

export default class Mutex {
  private static DEFAULT_QUEUE = '__MUTEX_DEFAULT_QUEUE'

  private queues: { [k: string]: Array<Task<any>> } = {}

  private busyQueues: { [k: string]: true } = {}

  synchronize<T> (task: Task<T>): Promise<T> {
    return this.synchronizeOn(Mutex.DEFAULT_QUEUE, task)
  }

  synchronizeOn<T> (key: string, task: Task<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.queues[key]) {
        this.queues[key] = []
      }

      this.queues[key].push(() => task().then(resolve).catch(reject))

      if (!this.busyQueues[key]) {
        this.dequeue(key)
      }
    })
  }

  private dequeue (queueName: string) {
    const next = this.queues[queueName].shift()

    if (!next) {
      delete this.busyQueues[queueName]
      delete this.queues[queueName]
      return
    }

    this.busyQueues[queueName] = true
    next().then(() => this.dequeue(queueName))
      .catch(() => this.dequeue(queueName))
  }
}
