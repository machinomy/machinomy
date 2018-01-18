export type Task<T> = () => Promise<T>

export default class Mutex {
  private queue: Array<Task<any>> = []

  private busy: boolean = false

  synchronize<T> (task: Task<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(() => task().then(resolve).catch(reject))

      if (!this.busy) {
        this.dequeue()
      }
    })
  }

  private dequeue () {
    const next = this.queue.shift()

    if (!next) {
      this.busy = false
      return
    }

    this.busy = true
    next().then(() => this.dequeue())
      .catch(() => this.dequeue())
  }
}
