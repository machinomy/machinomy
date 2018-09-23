import * as fs from 'fs-extra'
import * as path from 'path'
import * as contracts from './index'
import HDWalletProvider from '@machinomy/hdwallet-provider'
import Logger from '@machinomy/logger'

const LOG = new Logger('deploy-test-token')

const KEY = 'peanut giggle name tree canoe tube render ketchup survey segment army will'

async function run () {
  const ETH_RPC_URL = process.env.ETH_RPC_URL || 'https://rinkeby.infura.io'

  LOG.info(`ETH_RPC_URL = ${ETH_RPC_URL}`)

  const provider = HDWalletProvider.http(KEY, ETH_RPC_URL)

  LOG.info(`Wait for 30-60 seconds, please.`)

  const TestToken = contracts.TestToken.contract(provider)
  const instanceTestToken = await TestToken.new({ from: await provider.getAddress(0) })

  const address = instanceTestToken.address
  const transactionHash = instanceTestToken.transactionHash

  LOG.info(`Address = ${address}`)
  LOG.info(`TransactionHash = ${transactionHash}`)

  const newItemJSON = {
    events: {},
    links: {},
    address: address,
    transactionHash: transactionHash
  }

  const ARTIFACT_PATH = path.resolve(__dirname, '../build/contracts/TestToken.json')
  const testTokenJSON = require(ARTIFACT_PATH)
  testTokenJSON['networks']['4'] = newItemJSON

  fs.writeFileSync(ARTIFACT_PATH, JSON.stringify(testTokenJSON, null, 2))

  LOG.info('Test token has been successfully deployed.')

  process.exit(0)
}

run().then(() => {
  // Do Nothing
}).catch(error => {
  console.error(error)
  process.exit(1)
})
