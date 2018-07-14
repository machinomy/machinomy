import * as Web3 from 'web3'
import { memoize } from 'decko'
import Storage from './Storage'
import MachinomyOptions from './MachinomyOptions'
import ChannelContract from './ChannelContract'
import IChannelManager from './IChannelManager'
import ChannelManager from './ChannelManager'
import PaymentManager from './PaymentManager'
import ChainManager from './ChainManager'
import Client, { ClientImpl } from './client'
import IChannelsDatabase from './storage/IChannelsDatabase'
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
  async channelContract (): Promise<ChannelContract> {
    return new ChannelContract(this.web3, {} as IChannelsDatabase)
  }

  @memoize
  async storage (): Promise<Storage> {
    let channelContract = await this.channelContract()
    return Storage.build(this.options.databaseUrl, channelContract).then((storage: Storage) => {
      channelContract.setChannelsDAO(storage.channelsDatabase)
      return storage
    })
  }

  @memoize
  async chainManager (): Promise<ChainManager> {
    return new ChainManager(this.web3)
  }

  @memoize
  async paymentManager (): Promise<PaymentManager> {
    let chainManager = await this.chainManager()
    let channelContract = await this.channelContract()
    return new PaymentManager(chainManager, channelContract, this.options)
  }

  @memoize
  async client (): Promise<Client> {
    let transport = new Transport()
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
    return new ChannelManager(this.account, this.web3, channels, payments, tokens, channelContract, paymentManager, this.options)
  }
}
