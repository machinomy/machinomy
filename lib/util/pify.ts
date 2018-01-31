export default function pify<T> (fn: Function): Promise<T> {
  return new Promise((resolve, reject) => {
    const handler = (err: any, res: T) => {
      if (err) {
        return reject(err)
      }

      return resolve(res)
    }

    fn(handler)
  })
}
