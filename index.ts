import Web3 = require('web3')
import * as transport from './lib/transport'
import * as storage from './lib/storage'
import * as channel from './lib/channel'
import { default as Sender } from './lib/sender'
import { ChannelContract, contract } from './lib/channel'

class Machinomy {
  account: string
  web3: Web3
  engine: string
  databaseFile: string

  constructor (account: string, web3: Web3, options: any) {
    this.account = account
    this.web3 = web3
    this.engine = options.engine
    this.databaseFile = options.databaseFile
  }

  buy (options: any): Promise<any> {
    let _transport = transport.build()
    let contract = channel.contract(this.web3)
    let s = storage.build(this.web3, this.databaseFile, 'sender', false, this.engine)
    let client = new Sender(this.web3, this.account, contract, _transport, s)
    return client.buyMeta(options).then((res: any) => {
      return { channelId: res.payment.channelId, token: res.token }
    })
  }

  deposit (channelId: string, value: number) {
    let channelContract = contract(this.web3)
    return new Promise((resolve, reject) => {
      let s = storage.build(this.web3, this.databaseFile, 'sender', false, this.engine)
      s.channels.firstById(channelId).then((paymentChannel) => {
        if (paymentChannel) {
          channelContract.deposit(this.account, paymentChannel, value).then(() => {
            resolve()
          }).catch(reject)
        }
      }).catch(reject)
    })
  }

  channels (): Promise<any> {
    const namespace = 'sender'
    return new Promise((resolve, reject) => {
      let _storage = storage.build(this.web3, this.databaseFile, 'sender', false, this.engine)
      let engine = storage.engine(this.databaseFile, false, this.engine)
      storage.channels(this.web3, engine, namespace).all().then(found => {
        found = found.filter((ch) => {
          if (ch.state < 2) {
            return true
          } else {
            return false
          }
        })
        resolve(found)
      }).catch(reject)
    })
  }

  close (channelId: string) {
    let channelContract = contract(this.web3)
    return new Promise((resolve, reject) => {
      let s = storage.build(this.web3, this.databaseFile, 'sender', false, this.engine)
      s.channels.firstById(channelId).then((paymentChannel) => {
        if (paymentChannel) {
          if (paymentChannel.sender === this.account) {
            this.settle(channelContract, paymentChannel, resolve)
          } else if (paymentChannel.receiver === this.account) {
            this.claim(channelContract, paymentChannel, resolve)
          }
        }
      }).catch(reject)
    })
  }

  settle (channelContract: ChannelContract, paymentChannel: any, resolve: Function) {
    channelContract.getState(paymentChannel).then((state) => {
      if (state === 0) {
        channelContract.startSettle(this.account, paymentChannel, paymentChannel.spent).then(() => {
          console.log('startSettle is finished')
          resolve()
        }).catch((e: Error) => {
          console.log(e)
        })
      } else if (state === 1) {
        channelContract.finishSettle(this.account, paymentChannel).then(() => {
          console.log('finishSettle is finished')
          resolve()
        }).catch((e: Error) => {
          console.log(e)
        })
      }
    }).catch((e: Error) => {
      console.log(e)
    })
  }

  claim (channelContract: ChannelContract, paymentChannel: any, resolve: Function) {
    const channelId = paymentChannel.channelId
    let s = storage.build(this.web3, this.databaseFile, 'receiver', false, this.engine)
    s.payments.firstMaximum(channelId).then((paymentDoc: any) => {
      channelContract.claim(paymentChannel.receiver, paymentChannel, paymentDoc.value, Number(paymentDoc.v), paymentDoc.r, paymentDoc.s).then(value => {
        resolve()
      }).catch((e: Error) => {
        console.log(e)
      })
    }).catch((e: Error) => {
      console.log(e)
    })
  }
}

export default Machinomy
