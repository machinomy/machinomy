import * as path from 'path'
import * as fs from 'fs-extra'
import * as Web3 from 'web3'
import Machinomy from 'machinomy'
import HDWalletProvider from '@machinomy/hdwallet-provider'
import Logger from '@machinomy/logger'
import * as contracts from '@machinomy/contracts'

const payment = require(path.resolve('./payment.json'))
const PROVIDER = process.env.PROVIDER || 'https://rinkeby.infura.io'
const MNEMONIC_SENDER = process.env.MNEMONIC_SENDER || 'peanut giggle name tree canoe tube render ketchup survey segment army will'
const MNEMONIC_RECEIVER = process.env.MNEMONIC_RECEIVER || 'dance mutual spike analyst together average reject pudding hazard move fence install'
const LOG = new Logger('machinomy-receiver')

async function run () {
  fs.removeSync(path.resolve('./sender-receiver'))

  LOG.info(`PROVIDER = ${PROVIDER}`)
  LOG.info(`MNEMONIC SENDER = ${MNEMONIC_SENDER}`)
  LOG.info(`MNEMONIC RECEIVER = ${MNEMONIC_RECEIVER}`)

  const provider1 = HDWalletProvider.http(MNEMONIC_SENDER, PROVIDER)
  const provider2 = HDWalletProvider.http(MNEMONIC_RECEIVER, PROVIDER)
  const senderAccount = await provider1.getAddress(0)
  const receiverAccount = await provider2.getAddress(0)
  const receiverWeb3 = new Web3(provider2)
  const tokenAddress = payment.tokenContract
  const TestToken = contracts.TestToken.contract(receiverWeb3.currentProvider)
  const instanceTestToken = await TestToken.deployed()
  const receiverMachinomy = new Machinomy(
    receiverAccount,
    receiverWeb3, {
      databaseUrl: 'nedb://sender-receiver/database.nedb'
    }
  )

  LOG.info(`Sender: ${senderAccount}`)
  LOG.info(`Receiver: ${receiverAccount}`)
  LOG.info(`Token address: ${tokenAddress}`)
  LOG.info(`Accept payment: ${JSON.stringify(payment)}`)

  LOG.info(`Balance of Wallet ${senderAccount} = ${ await instanceTestToken.balanceOf(senderAccount) } tokens (+ ${payment.channelValue} tokens deposited in channel).`)
  LOG.info(`Balance of Wallet ${receiverAccount} = ${ await instanceTestToken.balanceOf(receiverAccount) } tokens.`)

  await receiverMachinomy.acceptPayment({
    payment: payment
  })

  LOG.info(`Start closing channel with channelID ${payment.channelId}`)

  await receiverMachinomy.close(payment.channelId)

  LOG.info(`Channel ${payment.channelId} was successfully closed.`)
  LOG.info(`Trace the last transaction via https://rinkeby.etherscan.io/address/${receiverAccount}`)
  LOG.info(`Receiver done.`)

  LOG.info(`Balance of Wallet ${senderAccount} = ${ await instanceTestToken.balanceOf(senderAccount) } tokens (- ${payment.price} tokens).`)
  LOG.info(`Balance of Wallet ${receiverAccount} = ${ await instanceTestToken.balanceOf(receiverAccount) } tokens (+ ${payment.price} tokens).`)

  process.exit(0)
}

run().catch(err => {
  console.error(err)
})
