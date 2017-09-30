import Promise = require('bluebird')
import _ = require('lodash')
import Engine from '../engines/engine'
import { ChannelId } from '../channel'
import Payment from '../Payment'

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
export default class PaymentsDatabase {
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
      s: payment.s,
      contractAddress: payment.contractAddress
    }
    // log.info(`Saving payment for channel ${payment.channelId} and token ${token}`)
    return this.engine.insert(document)
  }

  /**
   * Find a payment with maximum value on it inside the channel.
   */
  firstMaximum (channelId: ChannelId|string): Promise<Payment|null> {
    // log.info(`Trying to find last payment for channel ${channelId.toString()}`)
    let query = { kind: this.kind, channelId: channelId.toString() }
    return this.engine.find(query).then((documents: Array<Payment>) => {
      // log.info(`Found ${documents.length} payment documents`)
      let maximum = _.maxBy(documents, (payment: Payment) => payment.value)
      // log.info(`Found maximum payment for channel ${channelId}`, maximum)
      if (maximum) {
        return maximum
      } else {
        return null
      }
    })
  }
}
