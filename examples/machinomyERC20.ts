import * as configuration from '../lib/configuration'
import Web3 = require('web3')
import Machinomy from '../index'
import * as express from 'express'
import * as bodyParser from 'body-parser'
import { buildERC20Contract } from '@machinomy/contracts'

let sender = '0x5bf66080c92b81173f470e25f9a12fc146278429'
let receiver = '0xebeab176c2ca2ae72f11abb1cecad5df6ccb8dfe'

let provider = configuration.currentProvider()
let web3 = new Web3(provider)

let machinomyHub = new Machinomy(receiver, web3, { engine: 'nedb', databaseFile: 'hub' })
let hub = express()
hub.use(bodyParser.json())
hub.use(bodyParser.urlencoded({ extended: false }))
hub.post('/machinomy', async (req: express.Request, res: express.Response, next: Function) => {
  const body = await machinomyHub.acceptPayment(req.body)
  res.status(202).header('Paywall-Token', body.token).send(body)
})
let port = 3001
let server = hub.listen(port, function () {
  console.log('HUB is ready on port ' + port)
})

let f = async () => {
  /////// ERC20
  console.log('================================')
  console.log('ERC20')
  let machinomy = new Machinomy(sender, web3, { engine: 'nedb' })
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

  let message = 'This is first buy:'
  let resultFirstERC20 = await checkBalanceERC20(message, web3, sender, async () => {
    return machinomy.buy({
      receiver: receiver,
      price: 1,
      gateway: 'http://localhost:3001/machinomy',
      contractAddress: contractAddress,
      meta: 'metaidexample'
    }).catch((e: Error) => {
      console.log(e)
    })
  })

  message = 'This is second buy:'
  let resultSecondERC20 = await checkBalanceERC20(message, web3, sender, async () => {
    return machinomy.buy({
      receiver: receiver,
      price: 1,
      gateway: 'http://localhost:3001/machinomy',
      contractAddress: contractAddress,
      meta: 'metaidexample'
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
    return machinomy.buy({
      receiver: receiver,
      price: 1,
      gateway: 'http://localhost:3001/machinomy',
      contractAddress: contractAddress,
      meta: 'metaidexample'
    }).catch((e: Error) => {
      console.log(e)
    })
  })

  message = 'Claim by reciver'
  await checkBalanceERC20(message, web3, sender, async () => {
    // let machinomy2 = new Machinomy(receiver, web3, { engine: 'mongo' })
    await machinomyHub.close(resultThirdERC20.channelId)
  })

  console.log('ChannelId after first buy:', resultFirstERC20.channelId)
  console.log('ChannelId after second buy:', resultSecondERC20.channelId)
  console.log('ChannelId after once more buy:', resultThirdERC20.channelId)
  server.close()
//   try { fs.unlinkSync('machinomy') } catch (error) { console.log(error) }
//   try { fs.unlinkSync('hub') } catch (error) { console.log(error) }
}

f().catch((error) => {
  console.log(error)
  server.close()
//   try { fs.unlinkSync('machinomy') } catch (error) { console.log(error) }
//   try { fs.unlinkSync('hub') } catch (error) { console.log(error) }
})
