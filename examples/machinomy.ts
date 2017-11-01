import * as configuration from '../lib/configuration'
import Web3 = require('web3')
import Machinomy from '../index'
import * as express from 'express'
import Payment from '../lib/Payment'
import * as bodyParser from 'body-parser'
const fs = require('fs')

let sender = '0x5bf66080c92b81173f470e25f9a12fc146278429'
let receiver = '0xebeab176c2ca2ae72f11abb1cecad5df6ccb8dfe'

let getBalance = async (web3: Web3, account: string) => {
  return web3.eth.getBalance(account)
}

let provider = configuration.currentProvider()
let web3 = new Web3(provider)

let machinomyHub = new Machinomy(receiver, web3, { engine: 'nedb', databaseFile: 'hub' })
let hub = express()
hub.use(bodyParser.json())
hub.use(bodyParser.urlencoded({ extended: false }))
hub.post('/machinomy', async (req: express.Request, res: express.Response, next: Function) => {
  let payment = new Payment(req.body)
  let token = await machinomyHub.acceptPayment(payment)
  res.status(202).header('Paywall-Token', token).send('Accepted').end()
})

let checkBalance = async (message: string, web3: Web3, sender: string, cb: Function) => {
  console.log('----------')
  console.log(message)
  let balanceBefore = await getBalance(web3, sender)
  console.log('Balance before', web3.fromWei(balanceBefore, 'ether').toString())
  let result = await cb()
  let balanceAfter = await getBalance(web3, sender)
  console.log('Balance after', web3.fromWei(balanceAfter, 'ether').toString())
  let diff = balanceAfter.minus(balanceBefore)
  console.log('Diff', web3.fromWei(diff, 'ether').toString())
  return result
}

let port = 3001
let server = hub.listen(port, async () => {
  const price = web3.toWei(1, 'ether')
  let machinomy = new Machinomy(sender, web3, { engine: 'nedb' })

  let message = 'This is first buy:'
  let resultFirst = await checkBalance(message, web3, sender, async () => {
    return await machinomy.buy({
      receiver: receiver,
      price: price,
      gateway: 'http://localhost:3001/machinomy',
      meta: 'metaexample'
    }).catch((e: Error) => {
      console.log(e)
    })
  })

  message = 'This is second buy:'
  let resultSecond = await checkBalance(message, web3, sender, async () => {
    return await machinomy.buy({
      receiver: receiver,
      price: price,
      gateway: 'http://localhost:3001/machinomy',
      meta: 'metaexample'
    }).catch((e: Error) => {
      console.log(e)
    })
  })

  let channelId = resultSecond.channelId
  message = 'Deposit:'
  await checkBalance(message, web3, sender, async () => {
    await machinomy.deposit(channelId, price)
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
      gateway: 'http://localhost:3001/machinomy',
      meta: 'metaexample'
    }).catch((e: Error) => {
      console.log(e)
    })
  })

  message = 'Claim by reciver'
  await checkBalance(message, web3, sender, async () => {
    await machinomyHub.close(resultThird.channelId)
  })

  console.log('ChannelId after first buy:', resultFirst.channelId)
  console.log('ChannelId after second buy:', resultSecond.channelId)
  console.log('ChannelId after once more buy:', resultThird.channelId)

  server.close()
  try { fs.unlinkSync('machinomy') } catch (error) { console.log(error) }
  try { fs.unlinkSync('hub') } catch (error) { console.log(error) }
})
