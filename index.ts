import Web3 = require('web3')
import * as transport from './lib/transport'
import * as storage from './lib/storage'
import * as channel from './lib/channel'
import { default as Sender } from './lib/sender'
import { ChannelContract, contract } from './lib/channel'
import { PaymentChannel } from './lib/paymentChannel'
import BigNumber from 'bignumber.js'
// import * as BigNumber from 'bignumber.js'
import Payment from './lib/Payment'
// import { Receiver } from './lib/receiver'
import * as receiver from './lib/receiver'

/**
 * Options for machinomy buy.
 */
export interface BuyOptions {
  /** The address of Ethereum account. */
  receiver: string
  /** Price of content in wei. */
  price: number | BigNumber
  /** Endpoint for offchain payment that Machinomy send via HTTP.
   * The payment signed by web3 inside Machinomy.
   */
  gateway: string,
  meta: string,
  contractAddress?: string
}

/**
 * Params returned by buy operation. Generated channel id (or already exists opened channel)
 * and token as a proof of purchase.
 */
export interface BuyResult {
  channelId: channel.ChannelId
  token: string
}

/**
 * Params for Machinomy. Currenty Machinomy supports mongodb and nedb as a database engine.
 * Nedb is a default engine.
 */
export interface MachinomyOptions {
  /** "nedb" or "mongo". */
  engine?: string
  /** Path to nedb database file. In the browser will used as name for indexedb. */
  databaseFile?: string
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
  /** Web3 instance that manages {@link Machinomy.account}'s private key */
  private web3: Web3
  private engine: string
  private databaseFile: string
  private minimumChannelAmount?: BigNumber

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
   */
  constructor (account: string, web3: Web3, options: MachinomyOptions, minimumChannelAmount?: number | BigNumber) {
    this.account = account
    this.web3 = web3
    this.engine = options.engine || 'nedb'
    if (minimumChannelAmount) this.minimumChannelAmount = new BigNumber(minimumChannelAmount)
    if (options.databaseFile) {
      this.databaseFile = options.databaseFile
    } else {
      this.databaseFile = 'machinomy'
    }
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
  buy (options: BuyOptions): Promise<BuyResult> {
    let _transport = transport.build()
    let contract = channel.contract(this.web3)
    let s = storage.build(this.web3, this.databaseFile, 'shared', false, this.engine)
    let client = new Sender(this.web3, this.account, contract, _transport, s, this.minimumChannelAmount)
    return client.buyMeta(options).then((res: any) => {
      return { channelId: res.payment.channelId, token: res.token }
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
  deposit (channelId: string, value: BigNumber | number): Promise<void> {
    let _value = new BigNumber(value)
    let channelContract = contract(this.web3)
    return new Promise((resolve, reject) => {
      let s = storage.build(this.web3, this.databaseFile, 'shared', false, this.engine)
      s.channels.firstById(channelId).then((paymentChannel) => {
        if (paymentChannel) {
          channelContract.deposit(this.account, paymentChannel, _value).then(() => {
            resolve()
          }).catch(reject)
        }
      }).catch(reject)
    })
  }

  /**
   * Returns the list of opened channels.
   */
  channels (): Promise<PaymentChannel[]> {
    const namespace = 'shared'
    return new Promise((resolve, reject) => {
      let _storage = storage.build(this.web3, this.databaseFile, 'shared', false, this.engine)
      let engine = storage.engine(this.databaseFile, false, this.engine)
      storage.channels(this.web3, engine, namespace).all().then(found => {
        found = found.filter((ch) => {
          if (ch.state < 2) {
            return true
          } else {
            return false
          }
        })
        resolve(found)
      }).catch(reject)
    })
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
  close (channelId: string): Promise<void> {
    let channelContract = contract(this.web3)
    return new Promise((resolve, reject) => {
      let s = storage.build(this.web3, this.databaseFile, 'shared', false, this.engine)
      s.channels.firstById(channelId).then((paymentChannel) => {
        if (paymentChannel) {
          if (paymentChannel.sender === this.account) {
            this.settle(channelContract, paymentChannel).then(resolve).catch(reject)
          } else if (paymentChannel.receiver === this.account) {
            this.claim(channelContract, paymentChannel).then(resolve).catch(reject)
          }
        }
      }).catch(reject)
    })
  }

  /**
   * Save payment into the storage and return an id of the payment. The id can be used by {@link Machinomy.paymentById}.
   */
  acceptPayment (payment: Payment): Promise <string> {
    let s = storage.build(this.web3, this.databaseFile, 'shared', false, this.engine)
    let server = receiver.build(this.web3, this.account, s)
    return server.acceptPayment(payment)
  }

  /**
   * Return information about the payment by id.
   */
  paymentById (id: string): Promise <Payment | null> {
    let s = storage.build(this.web3, this.databaseFile, 'shared', false, this.engine)
    return s.payments.findByToken(id)
  }

  /**
   * @deprecated Use {@link Machinomy.paymentById} to find information about payment and verify it.
   */
  verifyToken (token: string): Promise <boolean> {
    let s = storage.build(this.web3, this.databaseFile, 'shared', false, this.engine)
    let server = receiver.build(this.web3, this.account, s)
    return server.acceptToken(token)
  }

  /**
   * Used by {@link Machinomy.close} if initiated by a sender.
   */
  private settle (channelContract: ChannelContract, paymentChannel: PaymentChannel): Promise<void> {
    return new Promise((resolve, reject) => {
      channelContract.getState(paymentChannel).then((state) => {
        if (state === 0) {
          let num = new BigNumber(paymentChannel.spent)
          channelContract.startSettle(this.account, paymentChannel, num).then(() => {
            console.log('startSettle is finished')
            resolve()
          }).catch(reject)
        } else if (state === 1) {
          channelContract.finishSettle(this.account, paymentChannel).then(() => {
            console.log('finishSettle is finished')
            resolve()
          }).catch(reject)
        }
      }).catch(reject)
    })
  }

  /**
   * Used by {@link Machinomy.close} if initiated by a receiver.
   */
  private claim (channelContract: ChannelContract, paymentChannel: PaymentChannel): Promise<void> {
    return new Promise((resolve, reject) => {
      const channelId = paymentChannel.channelId
      let s = storage.build(this.web3, this.databaseFile, 'shared', false, this.engine)
      s.payments.firstMaximum(channelId).then((paymentDoc: any) => {
        channelContract.claim(paymentChannel.receiver, paymentChannel, paymentDoc.value, Number(paymentDoc.v), paymentDoc.r, paymentDoc.s).then(value => {
          resolve()
        }).catch(reject)
      }).catch(reject)
    })
  }
}
