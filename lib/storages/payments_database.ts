import Engine from '../engines/engine'
import { ChannelId } from '../channel'
import Payment from '../Payment'
import util = require('ethereumjs-util')

const namespaced = (namespace: string | null | undefined, kind: string): string => {
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
      value: util.bufferToHex(util.toBuffer(payment.value.toString())),
      sender: payment.sender,
      receiver: payment.receiver,
      price: util.bufferToHex(util.toBuffer(payment.price.toString())),
      channelValue: util.bufferToHex(util.toBuffer(payment.channelValue.toString())),
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
  firstMaximum (channelId: ChannelId | string): Promise<Payment | null> {
    // log.info(`Trying to find last payment for channel ${channelId.toString()}`)
    let query = {kind: this.kind, channelId: channelId.toString()}
    return this.engine.find(query).then((documents: Array<Payment>) => {
      documents.map((document) => Payment.replaceHexToBigNumber(document))
      // log.info(`Found ${documents.length} payment documents`)
      let maximum = this.maxBy(documents)
      // log.info(`Found maximum payment for channel ${channelId}`, maximum)
      if (maximum) {
        return maximum
      } else {
        return null
      }
    })
  }

  maxBy (documents: Array<Payment>): Payment {
    if (documents.length === 1) return documents[0]
    let document = documents[0]
    documents.forEach((_document) => {
      if (_document.value.greaterThan(document.value)) {
        document = _document
      }
    })
    return document
  }

  /**
   * Find a payment by token.
   */
  findByToken (token: string): Promise<Payment | null> {
    let query = {kind: this.kind, token: token}
    return this.engine.findOne(query).then((document: Payment) => {
      document = Payment.replaceHexToBigNumber(document)
      return Promise.resolve(document)
    })
  }
}
