import * as Web3 from 'web3'
import { MigrateOption } from './MigrateOption'
import { PaymentChannel } from './PaymentChannel'
import * as BigNumber from 'bignumber.js'
import Payment, { PaymentSerde } from './payment'
import { TransactionResult } from 'truffle-contract'
import ChannelId from './ChannelId'
import { AcceptPaymentRequestSerde } from './accept_payment_request'
import { AcceptPaymentResponse } from './accept_payment_response'
import { AcceptTokenRequest } from './accept_token_request'
import { AcceptTokenResponse } from './accept_token_response'
import Registry from './Registry'
import MachinomyOptions from './MachinomyOptions'
import BuyOptions from './BuyOptions'
import NextPaymentResult from './NextPaymentResult'
import BuyResult from './BuyResult'
import { memoize } from 'decko'
import { PaymentRequiredResponse } from './PaymentRequiredResponse'

/**
 * Machinomy is a library for micropayments in Ether over HTTP.
 * Machinomy provides API to send and receive a minuscule amount of money instantly.
 * Core method is [buy]{@link Machinomy.buy}. The method does all the heavy lifting providing an easy interface
 * for micropayments.
 *
 * See [examples](https://github.com/machinomy/machinomy/tree/master/examples) directory for both client and server sides.
 *
 * NB. All monetary values below are denominated in Wei, including: [buy]{@link Machinomy.buy} and
 * [deposit]{@link Machinomy.deposit} methods.
 */
export default class Machinomy {
  readonly registry: Registry

  /** Ethereum account address that sends the money. */
  private readonly account: string

  constructor (account: string, web3: Web3, options?: MachinomyOptions) {
    this.account = account
    let _options = MachinomyOptions.defaults(options)
    this.registry = new Registry(account, web3, _options)
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
   *   receiver: receiver, // address
   *   price: 100,
   *   gateway: 'http://localhost:3001/machinomy'
   *  })
   * </code></pre>
   */
  async buy (options: BuyOptions): Promise<BuyResult> {
    await this.checkMigrationsState()
    if (!options.gateway) {
      throw new Error('gateway must be specified.')
    }

    let client = await this.registry.client()
    let channelManager = await this.registry.channelManager()

    const payment = await this.nextPayment(options)
    const res = await client.doPayment(payment, options.gateway, options.purchaseMeta)
    await channelManager.spendChannel(payment, res.token)
    return { token: res.token, channelId: payment.channelId }
  }

  async payment (options: BuyOptions): Promise<NextPaymentResult> {
    await this.checkMigrationsState()
    let channelManager = await this.registry.channelManager()
    const payment = await this.nextPayment(options)
    await channelManager.spendChannel(payment)
    return { payment: PaymentSerde.instance.serialize(payment) }
  }

  async pry (uri: string, datetime?: number): Promise<PaymentRequiredResponse> {
    await this.checkMigrationsState()
    let client = await this.registry.client()
    return client.doPreflight(uri, datetime)
  }

  async buyUrl (uri: string): Promise<BuyResult> {
    await this.checkMigrationsState()
    let client = await this.registry.client()
    let req = await client.doPreflight(uri)
    return this.buy({
      receiver: req.receiver,
      price: req.price,
      gateway: req.gateway,
      meta: req.meta,
      tokenContract: req.tokenContract
    })
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
    await this.checkMigrationsState()
    const _value = new BigNumber.BigNumber(value)
    let channelManager = await this.registry.channelManager()
    return channelManager.deposit(channelId, _value)
  }

  async open (receiver: string, value: BigNumber.BigNumber | number, channelId?: ChannelId | string, tokenContract?: string): Promise<PaymentChannel> {
    await this.checkMigrationsState()
    const _value = new BigNumber.BigNumber(value)
    let channelManager = await this.registry.channelManager()
    return channelManager.openChannel(this.account, receiver, _value, new BigNumber.BigNumber(0), channelId, tokenContract)
  }

  /**
   * Returns the list of opened channels.
   */
  async channels (): Promise<PaymentChannel[]> {
    await this.checkMigrationsState()
    let channelManager = await this.registry.channelManager()
    return channelManager.channels()
  }

  async openChannels (): Promise<PaymentChannel[]> {
    await this.checkMigrationsState()
    let channelManager = await this.registry.channelManager()
    return channelManager.openChannels()
  }

  async settlingChannels (): Promise<PaymentChannel[]> {
    await this.checkMigrationsState()
    let channelManager = await this.registry.channelManager()
    return channelManager.settlingChannels()
  }

  async channelById (channelId: string): Promise<PaymentChannel | null> {
    await this.checkMigrationsState()
    let channelManager = await this.registry.channelManager()
    return channelManager.channelById(channelId)
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
    await this.checkMigrationsState()
    let channelManager = await this.registry.channelManager()
    return channelManager.closeChannel(channelId)
  }

  /**
   * Save payment into the storage and return an id of the payment. The id can be used by {@link Machinomy.paymentById}.
   */
  async acceptPayment (req: any): Promise<AcceptPaymentResponse> {
    await this.checkMigrationsState()
    let client = await this.registry.client()
    return client.acceptPayment(AcceptPaymentRequestSerde.instance.deserialize(req))
  }

  /**
   * Return information about the payment by id.
   */
  async paymentById (id: string): Promise<Payment | null> {
    await this.checkMigrationsState()
    let storage = await this.registry.storage()
    return storage.paymentsDatabase.findByToken(id)
  }

  async acceptToken (req: AcceptTokenRequest): Promise<AcceptTokenResponse> {
    await this.checkMigrationsState()
    let client = await this.registry.client()
    return client.acceptVerify(req)
  }

  async shutdown (): Promise<void> {
    await this.checkMigrationsState()
    let storage = await this.registry.storage()
    return storage.engine.close()
  }

  private async nextPayment (options: BuyOptions): Promise<Payment> {
    await this.checkMigrationsState()
    const price = new BigNumber.BigNumber(options.price)

    let channelManager = await this.registry.channelManager()
    const channel = await channelManager.requireOpenChannel(this.account, options.receiver, price, undefined, options.tokenContract)
    return channelManager.nextPayment(channel.channelId, price, options.meta || '')
  }

  @memoize
  private async checkMigrationsState (): Promise<void> {
    let storage = await this.registry.storage()
    let isLatest = await storage.migrator.isLatest()
    let needMigration = !isLatest

    if (needMigration) {
      if (this.registry.options.migrate === undefined || this.registry.options.migrate === MigrateOption.Silent) {
        return storage.migrator.sync()
      } else {
        throw new Error('There are non-applied db-migrations!')
      }
    }
  }
}
