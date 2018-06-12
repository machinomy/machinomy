import * as BigNumber from 'bignumber.js'

/**
 * Params for Machinomy. Currenty Machinomy supports mongodb and nedb as a database engine.
 * Nedb is a default engine.
 */
export default interface MachinomyOptions {
  databaseUrl: string
  minimumChannelAmount?: number | BigNumber.BigNumber
  minimumSettlementPeriod?: number
  settlementPeriod?: number,
  closeOnInvalidPayment?: boolean
  migrate?: 'silent' | 'raise'
}
