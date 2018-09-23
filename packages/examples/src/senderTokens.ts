import * as path from 'path'
import * as fs from 'fs-extra'
import BigNumber from 'bignumber.js'
import * as Web3 from 'web3'
import Machinomy from 'machinomy'
import HDWalletProvider from '@machinomy/hdwallet-provider'
import Logger from '@machinomy/logger'
import * as contracts from '@machinomy/contracts'

const PROVIDER = process.env.PROVIDER || 'https://rinkeby.infura.io'
const MNEMONIC_SENDER = process.env.MNEMONIC_SENDER || 'peanut giggle name tree canoe tube render ketchup survey segment army will'
const MNEMONIC_RECEIVER = process.env.MNEMONIC_RECEIVER || 'dance mutual spike analyst together average reject pudding hazard move fence install'
const LOG = new Logger('machinomy-sender')

async function run () {
  fs.removeSync(path.resolve('./sender-receiver'))

  const provider1 = HDWalletProvider.http(MNEMONIC_SENDER, PROVIDER)
  const provider2 = HDWalletProvider.http(MNEMONIC_RECEIVER, PROVIDER)
  const senderAccount = await provider1.getAddress(0)
  const receiverAccount = await provider2.getAddress(0)
  const web3 = new Web3(provider1)
  const channelValue = new BigNumber(20)
  const paymentPrice = new BigNumber(5)
  const instanceTestToken: contracts.TestToken.Contract = await contracts.TestToken.contract(provider1).deployed()
  const tokenContract = instanceTestToken.address

  LOG.info(`PROVIDER = ${PROVIDER}`)
  LOG.info(`MNEMONIC SENDER = ${MNEMONIC_SENDER}`)
  LOG.info(`MNEMONIC RECEIVER = ${MNEMONIC_RECEIVER}`)
  LOG.info(`Token contract = ${tokenContract}`)

  const machinomy = new Machinomy(
    senderAccount,
    web3, {
      databaseUrl: 'nedb://sender-receiver/database.nedb'
    }
  )

  LOG.info(`Start opening Machinomy channel between sender ${senderAccount} and receiver ${receiverAccount} with value ${channelValue} tokens`)
  LOG.info(`For remote Ethereum nodes (e.g. Rinkeby or Ropsten) it can taking a 30-60 seconds.`)

  await machinomy.open(receiverAccount, channelValue, undefined, tokenContract)

  LOG.info(`Channel was opened.`)
  LOG.info(`Trace the last transaction via https://rinkeby.etherscan.io/address/${senderAccount}`)

  const payment = await machinomy.payment({
    receiver: receiverAccount,
    price: paymentPrice,
    tokenContract: tokenContract
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
