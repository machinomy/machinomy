import Web3 = require('web3')
import machinomyIndex from './index'
import * as transport from './lib/transport'
import * as storage from './lib/storage'
import * as channel from './lib/channel'
import { PaymentPair, default as Sender } from './lib/sender'
import mongo from './lib/mongo'
import * as BigNumber from 'bignumber.js'
import { ChannelContract } from './lib/channel'

class Machinomy {
  account: string
  web3: Web3
  engine: any

  constructor (account: string, web3: Web3, options: any) {
    this.account = account
    this.web3 = web3
    this.engine = options.engine
  }

  buy (options: any): Promise<any> {
    let _transport = transport.build()
    let _storage = storage.build(web3, settings.databaseFile, 'sender', false, settings.engine)
    let contract = channel.contract(web3)
    let client = new Sender(web3, this.account, contract, _transport, _storage)
    return client.buyMeta(options).then((res: any) => {
      return {channelId: res.payment.channelId, token: res.token}
    })
  }

  deposit (channelId: string, value: number) {
    console.log('deposit')
    return 1
  }

  channels (): Promise<any> {
    const namespace = 'sender'
    return new Promise((resolve, reject) => {
      let _storage = storage.build(web3, settings.databaseFile, 'sender', false, settings.engine)
      let contract = channel.contract(web3)
      let engine = storage.engine(settings.databaseFile, true, settings.engine)
      storage.channels(web3, engine, namespace).all().then(found => {
        found.forEach((paymentChannel) => {
          channel.contract(web3).getState(paymentChannel).then(state => {
            if (state < 2) {
              paymentChannel.state = state
              resolve(paymentChannel)
            }
          })
        })
      })
    })
  }

  close (channelId: string) {
    let channelContract = new ChannelContract()
    return new Promise((resolve, reject) => {
      let engine = storage.engine(settings.databaseFile, true, settings.engine)
      let s = storage.build(web3, settings.databaseFile, 'sender', false, settings.engine)
      s.channels.firstById(channelId).then((paymentChannel) => {
        if (paymentChannel) {
          if (paymentChannel.sender === this.account) {
            this.settle(channelContract, paymentChannel, resolve)
          } else if (paymentChannel.receiver === this.account) {
            this.claim(channelContract, paymentChannel, resolve)
          }
        }
      })
    })
  }

  settle(channelContract: ChannelContract, paymentChannel: any, resolve: Function) {
    channelContract.getState(paymentChannel).then((state) => {
      if (state === 0) {
        channelContract.startSettle(sender, paymentChannel, new BigNumber(1)).then(() => {
          console.log('startSettle is finished')
          resolve()
        })
      } else if (state === 1) {
        channelContract.finishSettle(sender, paymentChannel).then(() => {
          console.log('finishSettle is finished')
          resolve()
        })
      }
    })
  }

  claim(channelContract: ChannelContract, paymentChannel: any, resolve: Function) {
    console.log('close')
    return 1
  }
}

let headers: { [index: string]: string } = {}

let settings = machinomyIndex.configuration.sender()
let provider = machinomyIndex.configuration.currentProvider()
let web3 = new Web3(provider)

let sender = '0x5bf66080c92b81173f470e25f9a12fc146278429'
let receiver = '0xebeab176c2ca2ae72f11abb1cecad5df6ccb8dfe'

mongo.connectToServer(async () => {
  let machinomy = new Machinomy(sender, web3, {engine: 'nedb'})

  let result = await machinomy.buy({
    receiver: receiver,
    price: 1,
    gateway: 'http://localhost:3001/machinomy',
    contractAddress: '0x8ad5c3cd38676d630b060a09baa40b0a3cb0b4b5'
  }).catch((e: Error) => {
    console.log(e)
  })

  console.log(result)
  let channelId = result.channelId

  await machinomy.close(channelId)
  await machinomy.close(channelId)


  mongo.db().close()
})

export default Machinomy
