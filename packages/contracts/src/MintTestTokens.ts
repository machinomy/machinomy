#!/usr/bin/env node

import * as yargs from 'yargs'
import * as contracts from './index'
import Logger from '@machinomy/logger'
import HDWalletProvider from '@machinomy/hdwallet-provider'
import * as Web3 from 'web3'
import * as BigNumber from 'bignumber.js'

const LOG = new Logger('mint-test-tokens')

require('dotenv').config()

function pify<T> (fn: Function): Promise<T> {
  return new Promise((resolve, reject) => {
    const handler = (err: any, res: T) => {
      if (err) {
        return reject(err)
      }

      return resolve(res)
    }

    fn(handler)
  })
}

const ETH_RPC_URL = process.env.ETH_RPC_URL || 'http://localhost:8545'

const MINT_FROM_SEED_PHRASE = process.env.MINT_FROM_SEED_PHRASE
if (!MINT_FROM_SEED_PHRASE) {
  LOG.error('Please, set MINT_FROM_SEED_PHRASE env variable')
  process.exit(1)
}

const MINT_TO_SEED_PHRASE = process.env.MINT_TO_SEED_PHRASE
if (!MINT_TO_SEED_PHRASE) {
  LOG.error('Please, set MINT_TO_SEED_PHRASE env variable')
  process.exit(1)
}

const args = yargs
  .option('amount', {
    describe: 'Amount of tokens to send'
  })
  .argv

const MINT_AMOUNT = args['amount'] || 1

async function run (): Promise<void> {
  const providerFrom = HDWalletProvider.http(MINT_FROM_SEED_PHRASE!, ETH_RPC_URL)
  const providerTo = HDWalletProvider.http(MINT_TO_SEED_PHRASE!, ETH_RPC_URL)
  const web3From = new Web3(providerFrom)
  const web3To = new Web3(providerTo)
  const accountsFrom = await pify<string[]>((cb: (error: Error, accounts: string[]) => void) => {
    web3From.eth.getAccounts(cb)
  })
  const accountsTo = await pify<string[]>((cb: (error: Error, accounts: string[]) => void) => {
    web3To.eth.getAccounts(cb)
  })

  const TestToken = contracts.TestToken.contract(providerFrom)
  const instanceTestToken = await TestToken.deployed()
  await instanceTestToken.mint(accountsTo[0], new BigNumber.BigNumber(MINT_AMOUNT), {
    from: accountsFrom[0]
  })
  LOG.info(`${MINT_AMOUNT} test tokens have been minted for ${accountsTo[0]}.`)
  LOG.info(`Balance of ${accountsTo[0]} is ${await instanceTestToken.balanceOf(accountsTo[0])}.`)
  process.exit(0)
}

run().then(() => {
  // Do Nothing
}).catch(error => {
  console.error(error)
  process.exit(1)
})
