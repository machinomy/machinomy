import machinomyIndex from '../lib/buy'
import Web3 = require('web3')
import mongo from '../lib/mongo'
import Machinomy from '../index'
let headers: { [index: string]: string } = {}

let settings = machinomyIndex.configuration.sender()
let provider = machinomyIndex.configuration.currentProvider()
let web3 = new Web3(provider)

let sender = '0x5bf66080c92b81173f470e25f9a12fc146278429'
let receiver = '0xebeab176c2ca2ae72f11abb1cecad5df6ccb8dfe'

mongo.connectToServer(async () => {
  let machinomy = new Machinomy(sender, web3, { engine: 'mongo' })
  let result = await machinomy.buy({
    receiver: receiver,
    price: 1,
    gateway: 'http://localhost:3001/machinomy',
    contractAddress: '0x8ad5c3cd38676d630b060a09baa40b0a3cb0b4b5'
  }).catch((e: Error) => {
    console.log(e)
  })

  let channelId = result.channelId
  await machinomy.deposit(channelId, 5)
  await machinomy.close(channelId)
  await machinomy.close(channelId)

  mongo.db().close()
})
