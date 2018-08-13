import * as fs from 'fs'
import { URL } from 'url'

export async function readdir (path: string | Buffer | URL): Promise<Array<string>> {
  return new Promise<Array<string>>((resolve, reject) => {
    fs.readdir(path, (err, files) => {
      err ? reject(err) : resolve(files)
    })
  })
}

export async function stat (path: string | Buffer | URL): Promise<fs.Stats> {
  return new Promise<fs.Stats>((resolve, reject) => {
    fs.stat(path, (err, stats) => {
      err ? reject(err) : resolve(stats)
    })
  })
}
