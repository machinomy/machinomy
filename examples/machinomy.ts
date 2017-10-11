// import machinomyIndex from '../lib/buy'
import * as configuration from '../lib/configuration'
import Web3 = require('web3')
import mongo from '../lib/mongo'
import Machinomy from '../index'

let sender = '0x5bf66080c92b81173f470e25f9a12fc146278429'
let receiver = '0xebeab176c2ca2ae72f11abb1cecad5df6ccb8dfe'

let getBalance = async (web3: Web3, account: string) => {
  return Number(web3.eth.getBalance(account))
}

let checkBalance = async (message: string, web3: Web3, sender: string, cb: Function) => {
  console.log('----------')
  console.log(message)
  let balanceBefore = await getBalance(web3, sender)
  console.log('Balance before', web3.fromWei(balanceBefore, 'ether').toString())
  let result = await cb()
  let balanceAfter = await getBalance(web3, sender)
  console.log('Balance after', web3.fromWei(balanceAfter, 'ether').toString())
  let diff = balanceAfter - balanceBefore
  console.log('Diff', web3.fromWei(diff, 'ether').toString())
  return result
}

mongo.connectToServer(async () => {
  await mongo.db().dropDatabase()
  let provider = configuration.currentProvider()
  let web3 = new Web3(provider)

  const price = Number(web3.toWei(1, 'ether'))
  let machinomy = new Machinomy(sender, web3, { engine: 'mongo' })

  // contractAddress: '0x8ad5c3cd38676d630b060a09baa40b0a3cb0b4b5'
  let message = 'This is first buy:'
  let resultFirst = await checkBalance(message, web3, sender, async () => {
    return await machinomy.buy({
      receiver: receiver,
      price: price,
      gateway: 'http://localhost:3001/machinomy'
    }).catch((e: Error) => {
      console.log(e)
    })
  })

  message = 'This is second buy:'
  let resultSecond = await checkBalance(message, web3, sender, async () => {
    return await machinomy.buy({
      receiver: receiver,
      price: price,
      gateway: 'http://localhost:3001/machinomy'
    }).catch((e: Error) => {
      console.log(e)
    })
  })

  let channelId = resultSecond.channelId
  message = 'Deposit:'
  await checkBalance(message, web3, sender, async () => {
    await machinomy.deposit(channelId, price
    )
  })

  message = 'First close:'
  await checkBalance(message, web3, sender, async () => {
    await machinomy.close(channelId)
  })

  message = 'Second close:'
  await checkBalance(message, web3, sender, async () => {
    await machinomy.close(channelId)
  })

  message = 'Once more buy'
  let resultThird = await checkBalance(message, web3, sender, async () => {
    return await machinomy.buy({
      receiver: receiver,
      price: price,
      gateway: 'http://localhost:3001/machinomy'
    }).catch((e: Error) => {
      console.log(e)
    })
  })

  message = 'Claim by reciver'
  await checkBalance(message, web3, sender, async () => {
    let machinomy2 = new Machinomy(receiver, web3, { engine: 'mongo' })
    await machinomy2.close(resultThird.channelId)
  })

  console.log('ChannelId after first buy:', resultFirst.channelId)
  console.log('ChannelId after second buy:', resultSecond.channelId)
  console.log('ChannelId after once more buy:', resultThird.channelId)

  mongo.db().close()
})
