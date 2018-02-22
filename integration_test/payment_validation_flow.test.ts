import Web3 = require('web3')
import * as BigNumber from 'bignumber.js'
import * as express from 'express'
import * as bodyParser from 'body-parser'
import Machinomy, { BuyResult } from '../index'
import expectsRejection from '../test/util/expects_rejection'
const expect = require('expect')

const web3 = new Web3(new Web3.providers.HttpProvider(process.env.MACHINOMY_GETH_ADDR as string))
const sender = process.env.SENDER_ADDRESS as string
const receiver = process.env.RECEIVER_ADDRESS as string

describe('Payment validation flow', () => {
  const price = new BigNumber.BigNumber(web3.toWei(0.1, 'ether'))

  let hubPort: number

  let hubInstance: Machinomy

  let clientInstance: Machinomy

  let hubServer: any

  let serverListener: any

  describe('minimum settlement period', () => {
    before((done) => {
      hubPort = randomPort()

      hubInstance = new Machinomy(receiver, web3, {
        databaseUrl: `nedb:///tmp/machinomy-hub-${Date.now()}`,
        minimumSettlementPeriod: 10
      })

      clientInstance = new Machinomy(sender, web3, {
        settlementPeriod: 0,
        databaseUrl: `nedb:///tmp/machinomy-client-${Date.now()}`
      })

      hubServer = express()
      hubServer.use(bodyParser.json())
      hubServer.use(bodyParser.urlencoded({ extended: false }))
      hubServer.post('/machinomy', async (req: express.Request, res: express.Response) => {
        try {
          const body = await hubInstance.acceptPayment(req.body)
          res.status(200).send(body)
        } catch (e) {
          res.sendStatus(400)
        }
      })

      serverListener = hubServer.listen(hubPort, done)
    })

    after(async () => {
      await hubInstance.shutdown()
      await clientInstance.shutdown()
      serverListener.close()
    })

    it('should reject payments with a settlement period lower than the minimum', async () => {
      return expectsRejection(clientInstance.buy({
        receiver,
        price,
        gateway: `http://localhost:${hubPort}/machinomy`,
        meta: ''
      }))
    })

    it('should accept payments with a settlement period higher than the minimum', () => {
      clientInstance = new Machinomy(sender, web3, {
        settlementPeriod: 11,
        databaseUrl: `nedb:///tmp/machinomy-client-${Date.now()}`
      })

      return clientInstance.buy({
        receiver,
        price,
        gateway: `http://localhost:${hubPort}/machinomy`,
        meta: ''
      }).then((res: BuyResult) => {
        expect(res.token.length).toBeGreaterThan(0)
      })
    })
  })
})

function randomPort (): number {
  return 3000 + Math.floor(10000 * Math.random())
}
