import Storage from '../Storage'
import ChannelInflator from '../ChannelInflator'
import { tmpFileName } from './tmpFileName'

export async function tmpStorage (inflator: ChannelInflator): Promise<Storage> {
  let connectionUrl = process.env.DB_URL
  if (!connectionUrl) {
    let filename = await tmpFileName()
    connectionUrl = `sqlite://${filename}`
    console.warn(`DB_URL parameter is empty, using ${connectionUrl}`)
  }
  return Storage.build(connectionUrl, inflator)
}
