import Mutex from '../lib/util/mutex'

const expect = require('expect')

describe('Mutex', () => {
  let mutex: Mutex

  beforeEach(() => {
    mutex = new Mutex()
  })

  it('should process tasks in order', () => {
    function wait (time: number): Promise<number> {
      return new Promise((resolve) => setTimeout(() => resolve(time), time))
    }

    // use setImmediate to mimic an async operation calling the method
    function now (task: Function) {
      return new Promise((resolve) => setImmediate(() => task().then(resolve)))
    }

    const outs: number[] = []

    return Promise.all([
      now(() => mutex.synchronize(() => wait(2)).then((num) => outs.push(num))),
      now(() => mutex.synchronize(() => wait(7)).then((num) => outs.push(num))),
      now(() => mutex.synchronize(() => wait(3)).then((num) => outs.push(num)))
    ]).then(() => expect(outs).toEqual([2, 7, 3]))
  })
})
