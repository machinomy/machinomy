import * as channel from './channel'
import { Log } from 'typescript-logger'
import Promise = require('bluebird')
import _ = require('lodash')
import Datastore = require('nedb')
import Web3 = require('web3')
import { ChannelId, Payment, PaymentChannel, PaymentChannelJSON } from './channel'

const log = Log.create('storage')

const namespaced = (namespace: string|null|undefined, kind: string): string => {
  let result = kind
  if (namespace) {
    result = namespace + ':' + kind
  }
  return result
}

/**
 * Database layer for payments.
 */
export class PaymentsDatabase {
  kind: string
  engine: Engine

  constructor (engine: Engine, namespace: string | null) {
    this.kind = namespaced(namespace, 'payment')
    this.engine = engine
  }

  /**
   * Save payment to the database, to check later.
   */
  save (token: string, payment: Payment): Promise<void> {
    let document = {
      kind: this.kind,
      token: token,
      channelId: payment.channelId,
      value: payment.value,
      sender: payment.sender,
      receiver: payment.receiver,
      price: payment.price,
      channelValue: payment.channelValue,
      v: Number(payment.v),
      r: payment.r,
      s: payment.s
    }
    log.info(`Saving payment for channel ${payment.channelId} and token ${token}`)
    return this.engine.insert(document)
  }

  /**
   * Find a payment with maximum value on it inside the channel.
   */
  firstMaximum (channelId: ChannelId|string): Promise<Payment|null> {
    log.info(`Trying to find last payment for channel ${channelId.toString()}`)
    let query = { kind: this.kind, channelId: channelId.toString() }
    return this.engine.find(query).then((documents: Array<Payment>) => {
      log.info(`Found ${documents.length} payment documents`)
      let maximum = _.maxBy(documents, (payment: Payment) => payment.value)
      log.info(`Found maximum payment for channel ${channelId}`, maximum)
      if (maximum) {
        return maximum
      } else {
        return null
      }
    })
  }
}

export const payments = (engine: Engine, namespace: string | null): PaymentsDatabase => {
  return new PaymentsDatabase(engine, namespace)
}

/**
 * Database layer for tokens.
 */
export class TokensDatabase {
  kind: string
  engine: Engine

  constructor (engine: Engine, namespace: string | null) {
    this.kind = namespaced(namespace, 'token')
    this.engine = engine
  }

  /**
   * Save token for channelId
   */
  save (token: string, channelId: ChannelId|string): Promise<void> {
    let tokenDocument = {
      kind: this.kind,
      token: token.toString(),
      channelId: channelId.toString()
    }
    return this.engine.insert(tokenDocument)
  }

  /**
   * Check if token is stored.
   */
  isPresent (token: string): Promise<boolean> {
    let query = { kind: this.kind, token: token }
    return this.engine.findOne(query).then(document => {
      let result = Boolean(document)
      log.info(`Token ${token} is present: ${result}`)
      return result
    })
  }
}

export const tokens = (engine: Engine, namespace: string | null): TokensDatabase => {
  return new TokensDatabase(engine, namespace)
}

/**
 * Database layer for {PaymentChannel}
 */
export class ChannelsDatabase {
  web3: Web3
  engine: Engine
  kind: string

  constructor (web3: Web3, engine: Engine, namespace: string | null) {
    this.web3 = web3
    this.kind = namespaced(namespace, 'channel')
    this.engine = engine
  }

  save (paymentChannel: PaymentChannel): Promise<void> {
    let document = {
      kind: this.kind,
      sender: paymentChannel.sender,
      receiver: paymentChannel.receiver,
      value: paymentChannel.value,
      spent: paymentChannel.spent,
      channelId: paymentChannel.channelId
    }
    return this.engine.insert(document)
  }

  saveOrUpdate (paymentChannel: PaymentChannel): Promise<void> {
    return this.firstById(paymentChannel.channelId).then((found: PaymentChannel) => {
      if (found) {
        return this.spend(paymentChannel.channelId, paymentChannel.spent)
      } else {
        return this.save(paymentChannel)
      }
    })
  }

  firstById (channelId: ChannelId|string): Promise<PaymentChannel|null> {
    let query = {
      kind: this.kind,
      channelId: channelId.toString()
    }
    log.info(`ChannelsDatabase#findById Trying to find channel by id ${channelId.toString()}`)
    return this.engine.findOne<PaymentChannel>(query).then(document => {
      if (document) {
        return channel.contract(this.web3).getState(channelId.toString()).then(state => { // FIXME
          return new channel.PaymentChannel(document.sender, document.receiver, document.channelId, document.value, document.spent, state)
        })
      } else {
        log.info(`ChannelsDatabase#findById Could not find document by id ${channelId.toString()}`)
        return Promise.resolve(null)
      }
    })
  }

  /**
   * Set amount of money spent on the channel.
   */
  spend (channelId: ChannelId|string, spent: number): Promise<void> {
    let query = {
      kind: this.kind,
      channelId: channelId.toString()
    }
    let update = {
      $set: {
        spent: spent
      }
    }
    log.info(`ChannelsDatabase#spend channel ${channelId.toString()} spent ${spent}`)
    return this.engine.update(query, update)
  }

  /**
   * Retrieve all the payment channels stored.
   *
   * @return {Promise<PaymentChannel>}
   */
  all () {
    return this.allByQuery({})
  }

  /**
   * Find all channels by query, for example, by sender and receiver.
   */
  allByQuery (q: object): Promise<Array<PaymentChannel>> {
    let query = Object.assign({kind: this.kind}, q)
    log.info('ChannelsDatabase#allByQuery', query)
    let contract = channel.contract(this.web3)
    return Promise.map(this.engine.find(query), (doc: PaymentChannelJSON) => {
      return contract.getState(doc.channelId.toString()).then(state => {
        return new channel.PaymentChannel(doc.sender, doc.receiver, doc.channelId, doc.value, doc.spent, state)
      })
    })
  }
}

export const channels = (web3: Web3, engine: Engine, namespace: string | null): ChannelsDatabase => {
  return new ChannelsDatabase(web3, engine, namespace)
}

/**
 * Database engine.
 */
export class Engine {
  datastore: Datastore
  _find: (query: any) => Promise<any[]>
  _findOne: (query: any) => Promise<any>
  _insert: (document: any) => Promise<void>
  _update: (query: any, update: any, option: object) => Promise<void>

  constructor (path: string, inMemoryOnly: boolean = false) {
    this.datastore = new Datastore({ filename: path, autoload: true, inMemoryOnly: inMemoryOnly })
    this._find = Promise.promisify(this.datastore.find, { context: this.datastore })
    this._findOne = Promise.promisify(this.datastore.findOne, { context: this.datastore })
    this._insert = Promise.promisify(this.datastore.insert, { context: this.datastore })
    this._update = Promise.promisify(this.datastore.update, { context: this.datastore })
  }

  find<A> (query: object): Promise<Array<A>> {
    return this._find(query)
  }

  findOne<A> (query: object): Promise<A|null> {
    return this._findOne(query)
  }

  insert<A> (document: A): Promise<void> {
    return this._insert(document)
  }

  update (query: object, update: object): Promise<void> {
    return this._update(query, update, {})
  }
}

/**
 * Instantiate a storage engine.
 */
export const engine = (path: string, inMemoryOnly: boolean = false): Engine => {
  return new Engine(path, inMemoryOnly)
}

export default class Storage {
  namespace: string|null
  db: Datastore
  channels: ChannelsDatabase
  tokens: TokensDatabase
  payments: PaymentsDatabase

  constructor (web3: Web3, path: string, namespace: string|null, inMemoryOnly?: boolean) {
    let storageEngine = engine(path, inMemoryOnly)
    this.namespace = namespace || null
    this.db = storageEngine.datastore
    this.channels = channels(web3, storageEngine, namespace)
    this.tokens = tokens(storageEngine, namespace)
    this.payments = payments(storageEngine, namespace)
  }
}

/**
 * Build an instance of Storage.
 */
export const build = (web3: Web3, path: string, namespace: string | null = null, inMemoryOnly?: boolean): Storage => {
  return new Storage(web3, path, namespace, inMemoryOnly)
}
