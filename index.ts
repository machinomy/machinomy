import * as Web3 from 'web3'
import Engine from './lib/engines/engine'
import { PaymentChannel } from './lib/payment_channel'
import * as BigNumber from 'bignumber.js'
import Payment, { PaymentSerde } from './lib/payment'
import { TransactionResult } from 'truffle-contract'
import { Container } from './lib/container'
import ChannelManager from './lib/channel_manager'
import Client from './lib/client'
import { PaymentRequired } from './lib/transport'
import PaymentsDatabase from './lib/storages/payments_database'
import defaultRegistry from './lib/services'
import { MachinomyOptions } from './MachinomyOptions'
import ChannelId from './lib/ChannelId'
import { AcceptPaymentRequestSerde } from './lib/accept_payment_request'
import { AcceptPaymentResponse } from './lib/accept_payment_response'
import { AcceptTokenRequest } from './lib/accept_token_request'
import { AcceptTokenResponse } from './lib/accept_token_response'

export { Payment, PaymentChannel }

/**
 * Options for machinomy buy.
 */
export interface BuyOptions {
  /** The address of Ethereum account. */
  receiver: string
  /** Price of content in wei. */
  price: number | BigNumber.BigNumber
  /** Endpoint for offchain payment that Machinomy send via HTTP.
   * The payment signed by web3 inside Machinomy.
   */
  gateway?: string,
  meta?: string,
  contractAddress?: string
  purchaseMeta?: object
}

/**
 * Params returned by buy operation. Generated channel id (or already exists opened channel)
 * and token as a proof of purchase.
 */
export interface BuyResult {
  channelId: string
  token: string
}

export interface NextPaymentResult {
  payment: object
}

/**
 * Machinomy is a library for micropayments in Ether (and ERC20 tokens) over HTTP.
 * Machinomy provides API to send and receive a minuscule amount of money instantly.
 * Core method is [buy]{@link Machinomy.buy}. The method does all the heavy lifting providing an easy interface
 * for micropayments.
 *
 * NB. All monetary values below are denominated in Wei, including: [buy]{@link Machinomy.buy} and
 * [deposit]{@link Machinomy.deposit} methods.
 *
 * You can find ES5 example in this {@link https://github.com/machinomy/machinomy/tree/master/examples folder} of the project.
 * @example <caption>Buying with Machinomy (TypeScript)</caption>
 * <pre><code>import Machinomy from 'machinomy'
 * import Web3 = require('web3')
 *
 * const sender = '0x5bf66080c92b81173f470e25f9a12fc146278429'
 * const provider = new Web3.providers.HttpProvider("http://localhost:8545")
 * let web3 = new Web3(provider)
 *
 * let machinomy = new Machinomy(sender, web3, { engine: 'nedb' })
 *
 * const price = Number(web3.toWei(1, 'ether'))
 * const receiver = '0xebeab176c2ca2ae72f11abb1cecad5df6ccb8dfe'
 * const result = await machinomy.buy({
 *   receiver: receiver,
 *   price: price,
 *   gateway: 'http://localhost:3001/machinomy'
 *  })
 * let channelId = result.channelId
 * await machinomy.close(channelId)
 * // wait till the receiver claims the money during settling period
 * await machinomy.close(channelId) // and get the change if he/she does not
 * </code></pre>
 */
export default class Machinomy {
  /** Ethereum account address that sends the money. */
  private account: string

  private engine: Engine

  private serviceContainer: Container

  private channelManager: ChannelManager

  private paymentsDao: PaymentsDatabase

  private client: Client

  /**
   * Create an instance of Machinomy.
   *
   * @example <caption>Instantiating Machinomy.</caption>
   * <pre><code>const sender = '0x5bf66080c92b81173f470e25f9a12fc146278429'
   * const provider = new Web3.providers.HttpProvider("http://localhost:8545")
   * let web3 = new Web3(provider)
   *
   * let machinomy = new Machinomy(sender, web3, { engine: 'nedb' })</code></pre>
   *
   * @param account - Ethereum account address that sends the money. Make sure it is managed by Web3 instance passed as `web3` param.
   * @param web3 - Prebuilt web3 instance that manages the account and signs payments.
   * @param options - Options object
   */
  constructor (account: string, web3: Web3, options: MachinomyOptions) {
    options.closeOnInvalidPayment = typeof options.closeOnInvalidPayment === 'boolean' ? options.closeOnInvalidPayment : true

    const serviceRegistry = defaultRegistry()

    serviceRegistry.bind('Web3', () => web3)
    serviceRegistry.bind('MachinomyOptions', () => options)
    serviceRegistry.bind('account', () => account)
    serviceRegistry.bind('namespace', () => 'shared')

    this.serviceContainer = new Container(serviceRegistry)
    this.channelManager = this.serviceContainer.resolve('ChannelManager')
    this.paymentsDao = this.serviceContainer.resolve('PaymentsDatabase')
    this.client = this.serviceContainer.resolve('Client')

    this.account = account
    this.engine = this.serviceContainer.resolve('Engine')
  }

  /**
   * Entrypoint for a purchasing.
   *
   * Wnen you `buy` for the first time from the same receiver, the method opens a channel with a deposit equal to `price`✕10.
   * Next method call forms a payment and sends it via http to `gateway` url.
   *
   * The method then returns a token and channel id, in form of {@link BuyResult}.
   *
   * @example
   * <pre><code>machinomy.buy({
   *   receiver: receiver,
   *   price: 100,
   *   gateway: 'http://localhost:3001/machinomy'
   *  })
   * </code></pre>
   */
  async buy (options: BuyOptions): Promise<BuyResult> {
    if (!options.gateway) {
      throw new Error('gateway must be specified.')
    }

    const payment = await this.nextPayment(options)
    const res: AcceptPaymentResponse = await this.client.doPayment(payment, options.gateway, options.purchaseMeta)
    await this.channelManager.spendChannel(payment)
    return { token: res.token, channelId: payment.channelId }
  }

  async payment (options: BuyOptions): Promise<NextPaymentResult> {
    const payment = await this.nextPayment(options)
    await this.channelManager.spendChannel(payment)
    return { payment: PaymentSerde.instance.serialize(payment) }
  }

  async pry (uri: string): Promise<PaymentRequired> {
    return this.client.doPreflight(uri)
  }

  buyUrl (uri: string): Promise<BuyResult> {
    return this.client.doPreflight(uri).then((req: PaymentRequired) => this.buy({
      receiver: req.receiver,
      price: req.price,
      gateway: req.gateway,
      meta: req.meta,
      contractAddress: req.contractAddress
    }))
  }

  /**
   * Put more money into the channel.
   *
   * @example
   * <pre><code>
   * let channelId = '0x0bf080aeb3ed7ea6f9174d804bd242f0b31ff1ea24800344abb580cd87f61ca7'
   * machinomy.deposit(channelId, web3.toWei(1, "ether").toNumber(())) // Put 1 Ether more
   * </code></pre>
   *
   * @param channelId - Channel id.
   * @param value - Size of deposit in Wei.
   */
  async deposit (channelId: string, value: BigNumber.BigNumber | number): Promise<TransactionResult> {
    const _value = new BigNumber.BigNumber(value)
    return this.channelManager.deposit(channelId, _value)
  }

  async open (receiver: string, value: BigNumber.BigNumber | number, channelId?: ChannelId | string): Promise<PaymentChannel> {
    const _value = new BigNumber.BigNumber(value)
    return this.channelManager.openChannel(this.account, receiver, new BigNumber.BigNumber(0), _value, channelId)
  }

  /**
   * Returns the list of opened channels.
   */
  channels (): Promise<PaymentChannel[]> {
    return this.channelManager.channels()
  }

  openChannels (): Promise<PaymentChannel[]> {
    return this.channelManager.openChannels()
  }

  settlingChannels (): Promise<PaymentChannel[]> {
    return this.channelManager.settlingChannels()
  }

  channelById (channelId: string): Promise<PaymentChannel | null> {
    return this.channelManager.channelById(channelId)
  }

  /**
   * Share the money between sender and reciver according to payments made.
   *
   * For example a channel was opened with 10 Ether. Sender makes 6 purchases, 1 Ether each.
   * Total value transferred is 6 Ether.
   * If a party closes the channel, the money deposited to the channel are split.
   * The receiver gets 6 Ether. 4 unspent Ethers return to the sender.
   *
   * A channel can be closed in two ways, according to what party initiates that.
   * The method nicely abstracts over that, so you do not need to know what is really going on under the hood.
   * For more details on how payment channels work refer to a website.
   */
  async close (channelId: string): Promise<TransactionResult> {
    return this.channelManager.closeChannel(channelId)
  }

  /**
   * Save payment into the storage and return an id of the payment. The id can be used by {@link Machinomy.paymentById}.
   */
  acceptPayment (req: any): Promise<AcceptPaymentResponse> {
    return this.client.acceptPayment(AcceptPaymentRequestSerde.instance.deserialize(req))
  }

  /**
   * Return information about the payment by id.
   */
  paymentById (id: string): Promise<Payment | null> {
    return this.paymentsDao.findByToken(id)
  }

  acceptToken (req: AcceptTokenRequest): Promise<AcceptTokenResponse> {
    return this.client.acceptVerify(req)
  }

  shutdown (): Promise<void> {
    return this.engine.close()
  }

  private async nextPayment (options: BuyOptions): Promise<Payment> {
    const price = new BigNumber.BigNumber(options.price)

    const channel = await this.channelManager.requireOpenChannel(this.account, options.receiver, price)
    return this.channelManager.nextPayment(channel.channelId, price, options.meta || '')
  }
}
