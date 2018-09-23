import * as path from 'path'
import * as fs from 'fs-extra'
import BigNumber from 'bignumber.js'
import * as Web3 from 'web3'
import Machinomy from 'machinomy'
import HDWalletProvider from '@machinomy/hdwallet-provider'
import Logger from '@machinomy/logger'

const PROVIDER = process.env.PROVIDER || 'https://rinkeby.infura.io'
const MNEMONIC = process.env.MNEMONIC || 'peanut giggle name tree canoe tube render ketchup survey segment army will'
const LOG = new Logger('machinomy-sender')

async function run () {
  fs.removeSync(path.resolve('./sender-receiver'))

  const provider = HDWalletProvider.http(MNEMONIC, PROVIDER, 2)
  const senderAccount = await provider.getAddress(0)
  const receiverAccount = await provider.getAddress(1)
  const web3 = new Web3(provider)
  const minimumChannelAmount = new BigNumber(1).shift(4)
  const channelValue = new BigNumber(1).shift(6)
  const paymentPrice = new BigNumber(200000)

  LOG.info(`PROVIDER = ${PROVIDER}`)
  LOG.info(`MNEMONIC = ${MNEMONIC}`)

  const machinomy = new Machinomy(
    senderAccount,
    web3, {
      databaseUrl: 'nedb://sender-receiver/database.nedb',
      minimumChannelAmount: minimumChannelAmount
    }
  )

  LOG.info(`Start opening Machinomy channel between sender ${senderAccount} and receiver ${receiverAccount} with value ${channelValue} Wei`)
  LOG.info(`For remote Ethereum nodes (e.g. Rinkeby or Ropsten) it can taking a 30-60 seconds.`)

  await machinomy.open(receiverAccount, channelValue)

  LOG.info(`Channel was opened.`)
  LOG.info(`Trace the last transaction via https://rinkeby.etherscan.io/address/${senderAccount}`)

  const payment = await machinomy.payment({
    receiver: receiverAccount,
    price: paymentPrice
  })

  LOG.info('Payment: ')
  LOG.info(payment.payment)

  fs.writeFileSync('payment.json', JSON.stringify(payment.payment))

  LOG.info('Sender done.')

  process.exit(0)
}

run().catch(err => {
  console.error(err)
})
