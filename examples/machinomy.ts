// import machinomyIndex from '../lib/buy'
import * as configuration from '../lib/configuration'
import Web3 = require('web3')
import mongo from '../lib/mongo'
import Machinomy from '../index'
import { buildERC20Contract } from 'machinomy-contracts'

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

mongo.connectToServer().then( async () => {
  await mongo.db().dropDatabase()
  let provider = configuration.currentProvider()
  let web3 = new Web3(provider)

  const price = Number(web3.toWei(1, 'ether'))
  let machinomy = new Machinomy(sender, web3, { engine: 'nedb' })

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

  /////// ERC20
  console.log('================================')
  console.log('================================')
  console.log('ERC20')
  await mongo.db().dropDatabase()

  let contractAddress = '0x8ad5c3cd38676d630b060a09baa40b0a3cb0b4b5'
  let checkBalanceERC20 = async (message: string, web3: Web3, sender: string, cb: Function) => {
    let instanceERC20 = await buildERC20Contract(contractAddress, web3)
    let deployedERC20 = await instanceERC20.deployed()
    console.log('----------')
    console.log(message)
    let balanceBefore = (await deployedERC20.balanceOf(sender)).toNumber()
    console.log('Balance before', balanceBefore.toString())
    let result = await cb()
    let balanceAfter = (await deployedERC20.balanceOf(sender)).toNumber()
    console.log('Balance after', balanceAfter.toString())
    let diff = balanceAfter - balanceBefore
    console.log('Diff', diff.toString())
    return result
  }

  message = 'This is first buy:'
  let resultFirstERC20 = await checkBalanceERC20(message, web3, sender, async () => {
    return await machinomy.buy({
      receiver: receiver,
      price: 1,
      gateway: 'http://localhost:3001/machinomy',
      contractAddress: contractAddress
    }).catch((e: Error) => {
      console.log(e)
    })
  })

  message = 'This is second buy:'
  let resultSecondERC20 = await checkBalanceERC20(message, web3, sender, async () => {
    return await machinomy.buy({
      receiver: receiver,
      price: 1,
      gateway: 'http://localhost:3001/machinomy',
      contractAddress: contractAddress
    }).catch((e: Error) => {
      console.log(e)
    })
  })

  let channelIdERC20 = resultSecondERC20.channelId
  message = 'Deposit:'
  await checkBalanceERC20(message, web3, sender, async () => {
    await machinomy.deposit(channelIdERC20, 10)
  })

  message = 'First close:'
  await checkBalanceERC20(message, web3, sender, async () => {
    await machinomy.close(channelIdERC20)
  })

  message = 'Second close:'
  await checkBalanceERC20(message, web3, sender, async () => {
    await machinomy.close(channelIdERC20)
  })

  message = 'Once more buy'
  let resultThirdERC20 = await checkBalanceERC20(message, web3, sender, async () => {
    return await machinomy.buy({
      receiver: receiver,
      price: 1,
      gateway: 'http://localhost:3001/machinomy',
      contractAddress: contractAddress
    }).catch((e: Error) => {
      console.log(e)
    })
  })

  message = 'Claim by reciver'
  await checkBalanceERC20(message, web3, sender, async () => {
    let machinomy2 = new Machinomy(receiver, web3, { engine: 'mongo' })
    await machinomy2.close(resultThirdERC20.channelId)
  })

  console.log('ChannelId after first buy:', resultFirstERC20.channelId)
  console.log('ChannelId after second buy:', resultSecondERC20.channelId)
  console.log('ChannelId after once more buy:', resultThirdERC20.channelId)

  mongo.db().close()
}).catch((e: Error) => {
  console.log(e)
})
