import Web3 = require('web3')
import { Broker, TokenBroker, sign, paymentDigest, Signature, buildERC20Contract } from '@machinomy/contracts'
import { PaymentChannel } from './paymentChannel'
import Payment from './Payment'
import pify from './util/pify'

export default class ChainManager {
  private web3: Web3

  private _tokenBroker: TokenBroker.Contract

  private _defaultBroker: Broker.Contract

  private _chainId: number

  constructor (web3: Web3) {
    this.web3 = web3
  }

  async signPayment (channel: PaymentChannel, payment: Payment): Promise<Signature> {
    const digest = await this.paymentDigest(channel, payment)
    return sign(this.web3, channel.sender, digest)
  }

  async paymentDigest (channel: PaymentChannel, payment: Payment): Promise<string> {
    const chainId = await this.chainId()
    const deployed = await this.brokerForChannel(channel)
    return paymentDigest(channel.channelId, payment.value, deployed.address, chainId)
  }

  async deployedERC20 (contractAddress: string): Promise<any> {
    const instanceERC20 = await buildERC20Contract(contractAddress, this.web3)
    return instanceERC20.deployed()
  }

  async chainId (): Promise<number> {
    if (this._chainId) {
      return this._chainId
    }

    const chainId = await pify<string>((cb: (err: Error, networkId: string) => void) => this.web3.version.getNetwork(cb))
    this._chainId = Number(chainId)
    return this._chainId
  }

  async tokenBroker (): Promise<TokenBroker.Contract> {
    if (this._tokenBroker) {
      return this._tokenBroker
    }

    const deployed = await TokenBroker.deployed(this.web3.currentProvider)
    this._tokenBroker = deployed
    return deployed
  }

  async defaultBroker (): Promise<Broker.Contract> {
    if (this._defaultBroker) {
      return this._defaultBroker
    }

    const deployed = await Broker.deployed(this.web3.currentProvider)
    this._defaultBroker = deployed
    return deployed
  }

  private async brokerForChannel (channel: PaymentChannel): Promise<Broker.Contract | TokenBroker.Contract> {
    return (channel.contractAddress ? this.tokenBroker() : this.defaultBroker())
  }
}
