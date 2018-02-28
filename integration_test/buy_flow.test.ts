import Web3 = require('web3')
import * as BigNumber from 'bignumber.js'
import * as express from 'express'
import * as bodyParser from 'body-parser'
import Machinomy, { BuyResult } from '../index'
import { PaymentChannel } from '../lib/payment_channel'
import { AcceptTokenResponse } from '../lib/client'
const expect = require('expect')

const web3 = new Web3(new Web3.providers.HttpProvider(process.env.MACHINOMY_GETH_ADDR as string))
const sender = process.env.SENDER_ADDRESS as string
const receiver = process.env.RECEIVER_ADDRESS as string

describe('Buy flow', () => {
  const price = new BigNumber.BigNumber(web3.toWei(0.1, 'ether'))

  let senderOriginalBalance: BigNumber.BigNumber

  let receiverOriginalBalance: BigNumber.BigNumber

  let hubPort: number

  let hubInstance: Machinomy

  let clientInstance: Machinomy

  let hubServer: any

  let serverListener: any

  let firstChannelId: string

  before((done) => {
    hubPort = randomPort()

    hubInstance = new Machinomy(receiver, web3, {
      databaseUrl: `nedb:///tmp/machinomy-hub-${Date.now()}`,
      minimumSettlementPeriod: 0
    })

    clientInstance = new Machinomy(sender, web3, {
      settlementPeriod: 0,
      databaseUrl: `nedb:///tmp/machinomy-client-${Date.now()}`
    })

    hubServer = express()
    hubServer.use(bodyParser.json())
    hubServer.use(bodyParser.urlencoded({ extended: false }))
    hubServer.post('/machinomy', async (req: express.Request, res: express.Response) => {
      const body = await hubInstance.acceptPayment(req.body)
      res.status(200).send(body)
    })

    senderOriginalBalance = web3.eth.getBalance(sender)
    receiverOriginalBalance = web3.eth.getBalance(receiver)

    serverListener = hubServer.listen(hubPort, done)
  })

  after(async () => {
    await hubInstance.shutdown()
    await clientInstance.shutdown()
    serverListener.close()
  })

  describe('first buy', () => {
    let token: string

    before(() => {
      return clientInstance.buy({
        receiver,
        price,
        gateway: `http://localhost:${hubPort}/machinomy`,
        meta: ''
      }).then((res: BuyResult) => {
        token = res.token
        firstChannelId = res.channelId
      })
    })

    function verifyChan (channels: PaymentChannel[]) {
      expect(channels.length).toBe(1)

      const chan = channels[0]
      expect(chan.sender).toBe(sender)
      expect(chan.receiver).toBe(receiver)
      expect(chan.value.eq(price.mul(10))).toBe(true)
      expect(chan.spent.toString()).toBe(price.toString())
    }

    it('should open a new channel on the sender\'s side with 10x the value as deposit and the value as spent', () => {
      return clientInstance.channels().then(verifyChan)
    })

    it('should open a new channel on the receiver\'s side with 10x the value as deposit and the value as spent', () => {
      return hubInstance.channels().then(verifyChan)
    })

    it('should reduce the sender\'s balance by the deposit', () => {
      const balance = web3.eth.getBalance(sender)
      // use greaterThan to factor in the gas cost.
      expect(senderOriginalBalance.minus(web3.toWei(1, 'ether')).greaterThan(balance)).toBe(true)
    })

    it('should not affect the receiver\'s balance', () => {
      const balance = web3.eth.getBalance(receiver)
      expect(receiverOriginalBalance.eq(balance)).toBe(true)
    })

    it('should return a valid token', () => {
      return hubInstance.acceptToken({
        token
      }).then((res: AcceptTokenResponse) => {
        expect(res.status).toBe(true)
      })
    })
  })

  describe('invalid tokens', () => {
    it('should return an invalid response', () => {
      return hubInstance.acceptToken({
        token: 'honk'
      }).then((res: AcceptTokenResponse) => {
        expect(res.status).toBe(false)
      })
    })
  })

  describe('subsequent buy', () => {
    let channelId: string

    before(() => {
      return hubInstance.channels().then((channels: PaymentChannel[]) => {
        channelId = channels[0].channelId
      }).then(() => clientInstance.buy({
        receiver,
        price,
        gateway: `http://localhost:${hubPort}/machinomy`,
        meta: ''
      }))
    })

    function verifySameChannel (channels: PaymentChannel[]) {
      expect(channels.length).toBe(1)

      const chan = channels[0]
      expect(chan.channelId).toBe(channelId)
    }

    function verifyChannelValue (channels: PaymentChannel[]) {
      expect(channels.length).toBe(1)

      const chan = channels[0]
      expect(chan.spent.eq(web3.toWei(0.2, 'ether'))).toBe(true)
    }

    it('should use the same channel on the sender\'s side', () => {
      return clientInstance.channels().then(verifySameChannel)
    })

    it('should use the same channel on the receiver\'s side', () => {
      return hubInstance.channels().then(verifySameChannel)
    })

    it('should increment the channel\'s value on the sender\'s side', () => {
      return clientInstance.channels().then(verifyChannelValue)
    })

    it('should increment the channel\'s value on the receiver\'s side', () => {
      return hubInstance.channels().then(verifyChannelValue)
    })
  })

  describe('a buy whose total value is more than the channel value', () => {
    let newChannelId: string

    const newPrice = price.mul(10).plus(1)

    before(() => {
      return clientInstance.buy({
        receiver,
        price: newPrice,
        gateway: `http://localhost:${hubPort}/machinomy`,
        meta: ''
      }).then((res: BuyResult) => (newChannelId = res.channelId))
    })

    function verifyChan (channels: PaymentChannel[]) {
      expect(channels.length).toBe(2)

      const chan = channels.find((chan: PaymentChannel) => (chan.channelId === newChannelId))

      if (!chan) {
        throw new Error(`Channel ${newChannelId} not found.`)
      }

      expect(chan.sender).toBe(sender)
      expect(chan.receiver).toBe(receiver)
      expect(chan.value.eq(newPrice.mul(10))).toBe(true)
      expect(chan.spent.eq(newPrice)).toBe(true)
    }

    it('opens a new channel on the sender\'s side with the right deposit and spend', () => {
      return clientInstance.channels().then(verifyChan)
    })

    it('opens a new channel on the receiver\'s side with the right deposit and spend', () => {
      return hubInstance.channels().then(verifyChan)
    })
  })

  describe('claiming a channel', () => {
    before(() => {
      return hubInstance.close(firstChannelId)
    })

    // channels() returns open channels only.

    it('marks the channel as closed for the sender', () => {
      return clientInstance.channels().then((channels: PaymentChannel[]) => {
        expect(channels.find((chan: PaymentChannel) => (chan.channelId === firstChannelId))).toBe(undefined)
      })
    })

    it('marks the channel as closed for the receiver', () => {
      return hubInstance.channels().then((channels: PaymentChannel[]) => {
        expect(channels.find((chan: PaymentChannel) => (chan.channelId === firstChannelId))).toBe(undefined)
      })
    })

    it('disburses whatever is left over to the sender', () => {
      const balance = web3.eth.getBalance(sender)
      expect(balance.lessThan(senderOriginalBalance.minus(web3.toWei(0.2, 'ether')))).toBe(true)
      // use 20 ether here since 0.8 ether is returned and 20 are still in deposit
      expect(balance.greaterThan(senderOriginalBalance.minus(web3.toWei(20, 'ether')))).toBe(true)
    })

    it('disburses the balance to the receiver', () => {
      const balance = web3.eth.getBalance(receiver)
      expect(balance.greaterThan(receiverOriginalBalance.plus(web3.toWei(0.19, 'ether')))).toBe(true)
    })
  })

  describe('opening a raw channel', () => {
    let channel: PaymentChannel

    beforeEach(async () => {
      channel = await clientInstance.open(receiver, new BigNumber.BigNumber(web3.toWei(0.1, 'ether')))
    })

    it('should open a channel with the provided value', () => {
      expect(channel.value.eq(web3.toWei(0.1, 'ether'))).toBe(true)
    })
  })
})

function randomPort (): number {
  return 3000 + Math.floor(10000 * Math.random())
}
