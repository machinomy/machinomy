import * as BigNumber from 'bignumber.js'
import { MigrateOption } from './MigrateOption'

/**
 * Params for Machinomy. Currently Machinomy supports nedb and postgresql as a database engine.
 * Nedb is a default engine.
 */
export default interface MachinomyOptions {
  databaseUrl: string
  minimumChannelAmount?: number | BigNumber.BigNumber
  minimumSettlementPeriod?: number
  settlementPeriod?: number,
  closeOnInvalidPayment?: boolean
  migrate?: MigrateOption
}
