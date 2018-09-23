import * as path from 'path'
import * as fs from 'fs-extra'
import BigNumber from 'bignumber.js'
import * as Web3 from 'web3'
import Machinomy from 'machinomy'
import HDWalletProvider from '@machinomy/hdwallet-provider'
import Logger from '@machinomy/logger'

const payment = require(path.resolve('./payment.json'))
const PROVIDER = process.env.PROVIDER || 'https://rinkeby.infura.io'
const MNEMONIC = process.env.MNEMONIC || 'peanut giggle name tree canoe tube render ketchup survey segment army will'
const LOG = new Logger('machinomy-receiver')

async function run () {
  fs.removeSync(path.resolve('./sender-receiver'))

  LOG.info(`PROVIDER = ${PROVIDER}`)
  LOG.info(`MNEMONIC = ${MNEMONIC}`)

  const provider = HDWalletProvider.http(MNEMONIC, PROVIDER, 2)
  const receiverAccount = await provider.getAddress(1)
  const receiverWeb3 = new Web3(provider)
  const minimumChannelAmount = new BigNumber(1).shift(4)
  const receiverMachinomy = new Machinomy(
    receiverAccount,
    receiverWeb3, {
      databaseUrl: 'nedb://sender-receiver/database.nedb',
      minimumChannelAmount: minimumChannelAmount
    }
  )

  LOG.info(`Receiver: ${receiverAccount}`)
  LOG.info(`Accept payment: ${JSON.stringify(payment)}`)

  await receiverMachinomy.acceptPayment({
    payment: payment
  })

  LOG.info(`Start closing channel with channelID ${payment.channelId}`)

  await receiverMachinomy.close(payment.channelId)

  LOG.info(`Channel ${payment.channelId} was successfully closed.`)
  LOG.info(`Trace the last transaction via https://rinkeby.etherscan.io/address/${receiverAccount}`)
  LOG.info(`Receiver done.`)

  process.exit(0)
}

run().catch(err => {
  console.error(err)
})
