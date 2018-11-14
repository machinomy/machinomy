import { Semaphore } from 'await-semaphore'

export type Task<T> = () => Promise<T>

export default class Mutex {
  private static DEFAULT_QUEUE = '__MUTEX_DEFAULT_QUEUE'

  private queues = new Map<string, Semaphore>()

  synchronize<T> (task: Task<T>): Promise<T> {
    return this.synchronizeOn(Mutex.DEFAULT_QUEUE, task)
  }

  async synchronizeOn<T> (key: string, task: Task<T>): Promise<T> {
    let semaphore = this.queues.get(key)
    if (!semaphore) {
      semaphore = new Semaphore(1)
      this.queues.set(key, semaphore)
    }
    return semaphore.use(task)
  }
}
