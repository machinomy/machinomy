import ChannelId from '../../ChannelId'
import Payment, { PaymentSerde } from '../../payment'
import EnginePostgres from './EnginePostgres'
import AbstractPaymentsDatabase from '../AbstractPaymentsDatabase'

export default class PostgresPaymentsDatabase extends AbstractPaymentsDatabase<EnginePostgres> {
  save (token: string, payment: Payment): Promise<void> {
    const serialized: any = PaymentSerde.instance.serialize(payment)
    serialized.kind = this.kind
    serialized.token = token

    return this.engine.exec((client: any) => client.query(
      'INSERT INTO payment("channelId", kind, token, sender, receiver, price, value, ' +
      '"channelValue", v, r, s, meta, "contractAddress", "createdAt") VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)',
      [
        serialized.channelId,
        serialized.kind,
        serialized.token,
        serialized.sender,
        serialized.receiver,
        serialized.price,
        serialized.value,
        serialized.channelValue,
        serialized.v,
        serialized.r,
        serialized.s,
        serialized.meta,
        serialized.contractAddress,
        Date.now()
      ]
    ))
  }

  firstMaximum (channelId: ChannelId | string): Promise<Payment | any> {
    return this.engine.exec((client: any) => client.query(
      'SELECT "channelId", kind, token, sender, receiver, price, value, ' +
      '"channelValue", v, r, s, meta, "contractAddress", "createdAt" FROM payment WHERE "channelId" = $1 ' +
      'ORDER BY value DESC',
      [
        channelId.toString()
      ]
    )).then((res: any) => this.inflatePayment(res.rows[0]))
  }

  findByToken (token: string): Promise<Payment | any> {
    return this.engine.exec((client: any) => client.query(
      'SELECT "channelId", kind, token, sender, receiver, price, value, ' +
      '"channelValue", v, r, s, meta, "contractAddress", "createdAt" FROM payment WHERE token = $1',
      [
        token
      ]
    )).then((res: any) => this.inflatePayment(res.rows[0]))
  }
}
