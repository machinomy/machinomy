import Storage from '../Storage'
import ChannelInflator from '../ChannelInflator'
// import { tmpFileName } from './tmpFileName'

export async function tmpStorage (inflator: ChannelInflator): Promise<Storage> {
  let connectionUrl = process.env.DATABASE_URL
  if (!connectionUrl) {
    let filename = './tmp' // await tmpFileName()
    connectionUrl = `sqlite://${filename}`
    console.warn(`DATABASE_URL parameter is empty, using ${connectionUrl}`)
  }
  return Storage.build(connectionUrl, inflator)
}
