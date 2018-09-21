import * as Web3 from 'web3'
import { memoize } from 'decko'
import ChainCache from './ChainCache'
import ChannelEthContract from './ChannelEthContract'
import ChannelTokenContract from './ChannelTokenContract'
import ChannelInflator from './ChannelInflator'
import Storage from './Storage'
import MachinomyOptions from './MachinomyOptions'
import ChannelContract from './ChannelContract'
import IChannelManager from './IChannelManager'
import ChannelManager from './ChannelManager'
import PaymentManager from './PaymentManager'
import ChainManager from './ChainManager'
import Client, { ClientImpl } from './client'
import { Transport } from './transport'

export default class Registry {
  account: string
  web3: Web3
  options: MachinomyOptions

  constructor (account: string, web3: Web3, options: MachinomyOptions) {
    this.account = account
    this.web3 = web3
    this.options = options
  }

  @memoize
  async inflator (): Promise<ChannelInflator> {
    const channelEthContract = await this.channelEthContract()
    const channelTokenContract = await this.channelTokenContract()
    const chainCache = await this.chainCache()
    return new ChannelInflator(channelEthContract, channelTokenContract, chainCache)
  }

  @memoize
  async channelEthContract (): Promise<ChannelEthContract> {
    return new ChannelEthContract(this.web3)
  }

  @memoize
  async channelTokenContract (): Promise<ChannelTokenContract> {
    return new ChannelTokenContract(this.web3)
  }

  @memoize
  async channelContract (): Promise<ChannelContract> {
    const channelEthContract = await this.channelEthContract()
    const channelTokenContract = await this.channelTokenContract()
    const storage = await this.storage()
    const channelsDatabase = storage.channelsDatabase
    return new ChannelContract(this.web3, channelsDatabase, channelEthContract, channelTokenContract)
  }

  @memoize
  async storage (): Promise<Storage> {
    const inflator = await this.inflator()
    return Storage.build(this.options.databaseUrl, inflator)
  }

  @memoize
  async chainManager (): Promise<ChainManager> {
    return new ChainManager(this.web3)
  }

  @memoize
  async paymentManager (): Promise<PaymentManager> {
    let chainManager = await this.chainManager()
    let channelContract = await this.channelContract()
    let chainCache = await this.chainCache()
    return new PaymentManager(chainManager, channelContract, chainCache, this.options)
  }

  @memoize
  async client (): Promise<Client> {
    let transport = this.options.transport ? this.options.transport :  new Transport()
    let channelManager = await this.channelManager()
    return new ClientImpl(transport, channelManager)
  }

  @memoize
  async channelManager (): Promise<IChannelManager> {
    let storage = await this.storage()
    let payments = storage.paymentsDatabase
    let channels = storage.channelsDatabase
    let tokens = storage.tokensDatabase
    let channelContract = await this.channelContract()
    let paymentManager = await this.paymentManager()
    let chainCache = await this.chainCache()
    return new ChannelManager(this.account, this.web3, channels, payments, tokens, channelContract, paymentManager, chainCache, this.options)
  }

  @memoize
  async chainCache (): Promise<ChainCache> {
    return new ChainCache(this.options.chainCachePeriod)
  }
}
