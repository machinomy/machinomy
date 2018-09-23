/**
 * To run the file, it requires two environment variables to be set.
 * `PROVIDER_URL` is a JSON RPC endpoint. Infura works just fine. For Rinkeby test network,
 * you could set it to `PROVIDER_URL="https://rinkeby.infura.io/"`. Another variable is `MNEMONIC`.
 * It is a [12-word seed phrase](https://github.com/pirapira/ethereum-word-list/blob/master/README.md#mnemonic-phrase).
 * For example, `MNEMONIC="brain surround have swap horror body response double fire dumb bring hazard"`
 *
 * Start this file then:
 *
 * yarn build
 * PROVIDER_URL="https://rinkeby.infura.io/" MNEMONIC="brain surround have swap horror body response double fire dumb bring hazard" node server.js
 *
 * The script runs 3 core endpoints:
 * `http://localhost:3000/content` provides an example of the paid content.
 * `http://localhost:3001/accept` accepts payment.
 * `http://localhost:3001/verify/:token` verifies token that `/accept` generates.
 *
 * The client side for buying the content is provided in `client.ts` file.
 */

import * as express from 'express'
import * as Web3 from 'web3'
import Machinomy from 'machinomy'
import * as bodyParser from 'body-parser'
import { AcceptTokenRequestSerde } from 'machinomy/lib/accept_token_request'
import { PaymentChannelSerde } from 'machinomy/lib/PaymentChannel'
import fetcher from 'machinomy/lib/util/fetcher'
import HDWalletProvider from '@machinomy/hdwallet-provider'

async function main () {
  const PROVIDER_URL = String(process.env.PROVIDER_URL)
  const MNEMONIC = String(process.env.MNEMONIC)

  const HOST = 'localhost'
  const APP_PORT = 3000
  const HUB_PORT = 3001

  const provider = HDWalletProvider.http(MNEMONIC, PROVIDER_URL)
  const web3 = new Web3(provider)

  /**
   * Account that receives payments.
   */
  let receiver = await provider.getAddress(0)

  /**
   * Create machinomy instance that provides API for accepting payments.
   */
  let machinomy = new Machinomy(receiver, web3, { databaseUrl: 'nedb://./server' })

  let hub = express()
  hub.use(bodyParser.json())
  hub.use(bodyParser.urlencoded({ extended: false }))

  /**
   * Recieve an off-chain payment issued by `machinomy buy` command.
   */
  hub.post('/accept', async (req, res) => {
    const body = await machinomy.acceptPayment(req.body)
    res.status(202).header('Paywall-Token', body.token).send(body)
  })

  /**
   * Verify the token that `/accept` generates.
   */
  hub.get('/verify/:token', async (req, res) => {
    const token = req.params.token as string
    const acceptTokenRequest = AcceptTokenRequestSerde.instance.deserialize({ token })
    const isAccepted = (await machinomy.acceptToken(acceptTokenRequest)).status
    if (isAccepted) {
      res.status(200).send({ status: 'ok' })
    } else {
      res.status(400).send({ status: 'token is invalid' })
    }
  })

  hub.get('/channels', async (req, res) => {
    const channels = await machinomy.channels()
    res.status(200).send(channels.map(PaymentChannelSerde.instance.serialize))
  })

  hub.get('/claim/:channelid', async (req, res) => {
    try {
      let channelId = req.params.channelid
      await machinomy.close(channelId)
      res.status(200).send('Claimed')
    } catch (error) {
      res.status(404).send('No channel found')
      console.error(error)
    }
  })

  hub.listen(HUB_PORT, () => {
    console.log('HUB is ready on port ' + HUB_PORT)
  })

  let app = express()
  let paywallHeaders = () => {
    let headers: { [index: string]: string } = {}
    headers['Paywall-Version'] = '0.0.3'
    headers['Paywall-Price'] = '1000'
    headers['Paywall-Address'] = receiver
    headers['Paywall-Gateway'] = `http://${HOST}:${HUB_PORT}/accept`
    return headers
  }

  /**
   * Example of serving a paid content. You can buy it with `machinomy buy http://localhost:3000/content` command.
   */
  app.get('/content', async (req, res) => {
    let reqUrl = `http://${HOST}:${HUB_PORT}/verify`
    let content = req.get('authorization')
    if (content) {
      let token = content.split(' ')[1]
      let response = await fetcher.fetch(reqUrl + '/' + token)
      let json = await response.json()
      let status = json.status
      if (status === 'ok') {
        res.send('Thank you for your purchase!')
      } else {
        res.status(402).set(paywallHeaders()).send('Content is not available')
      }
    } else {
      res.status(402).set(paywallHeaders()).send('Content is not available')
    }
  })

  app.listen(APP_PORT, function () {
    console.log('Content proveder is ready on ' + APP_PORT)
  })
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
