import * as channel from '../channel'
import Web3 = require('web3')
import Engine from '../engines/engine'
import { ChannelId, PaymentChannel, PaymentChannelJSON } from '../channel'
import BigNumber from 'bignumber.js'
import util = require('ethereumjs-util')

const namespaced = (namespace: string|null|undefined, kind: string): string => {
  let result = kind
  if (namespace) {
    result = namespace + ':' + kind
  }
  return result
}

/**
 * Database layer for {PaymentChannel}
 */
export default class ChannelsDatabase {
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
      value: util.bufferToHex(util.toBuffer(paymentChannel.value.toString())),
      spent: util.bufferToHex(util.toBuffer(paymentChannel.spent.toString())),
      channelId: paymentChannel.channelId,
      contractAddress: paymentChannel.contractAddress
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
    // log.info(`ChannelsDatabase#findById Trying to find channel by id ${channelId.toString()}`)
    return this.engine.findOne<PaymentChannel>(query).then(document => {
      if (document) {
        return channel.contract(this.web3).getState(document).then(state => { // FIXME
          return new channel.PaymentChannel(document.sender, document.receiver, document.channelId, document.value, document.spent, state, document.contractAddress)
        })
      } else {
        // log.info(`ChannelsDatabase#findById Could not find document by id ${channelId.toString()}`)
        return Promise.resolve(null)
      }
    })
  }

  /**
   * Set amount of money spent on the channel.
   */
  spend (channelId: ChannelId|string, spent: BigNumber): Promise<void> {
    let query = {
      kind: this.kind,
      channelId: channelId.toString()
    }
    let update = {
      $set: {
        spent: util.bufferToHex(util.toBuffer(spent.toString()))
      }
    }
    // log.info(`ChannelsDatabase#spend channel ${channelId.toString()} spent ${spent}`)
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
    let contract = channel.contract(this.web3)

    return this.engine.find<PaymentChannelJSON>(query).then(arr => {
      let promises: Array<Promise<channel.PaymentChannel>> = arr.map(doc => {
        let paymentChannel = PaymentChannel.fromDocument(doc)
        return contract.getState(paymentChannel).then(state => {
          return new channel.PaymentChannel(doc.sender, doc.receiver, doc.channelId, doc.value, doc.spent, state, doc.contractAddress)
        })
      })
      return Promise.all<channel.PaymentChannel>(promises)
    })
  }
}
