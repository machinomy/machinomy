import * as BigNumber from 'bignumber.js'
import { MigrateOption } from './MigrateOption'
import { Transport } from './transport'

/**
 * Params for Machinomy. Currently Machinomy supports nedb and postgresql as a database engine.
 * Nedb is a default engine.
 */
export interface MachinomyOptions {
  databaseUrl: string
  minimumChannelAmount?: number | BigNumber.BigNumber
  minimumSettlementPeriod?: number
  settlementPeriod?: number,
  closeOnInvalidPayment?: boolean
  migrate?: MigrateOption,
  chainCachePeriod?: number,
  transport?: Transport
}

export namespace MachinomyOptions {
  export function defaults (options?: MachinomyOptions): MachinomyOptions {
    let defaultOptions = {
      databaseUrl: 'nedb://machinomy'
    }
    return Object.assign({}, defaultOptions, options)
  }
}

export default MachinomyOptions
