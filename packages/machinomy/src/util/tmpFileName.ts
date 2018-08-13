import * as tmp from 'tmp'

export function tmpFileName (): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    tmp.tmpName((err, path) => {
      err ? reject(err) : resolve(path)
    })
  })
}
