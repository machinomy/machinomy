import { PaymentChannel } from './lib/PaymentChannel'
import Payment from './lib/payment'
import Machinomy from './lib/Machinomy'
import BuyResult from './lib/BuyResult'
import BuyOptions from './lib/BuyOptions'
import { PaymentRequired } from './lib/transport'
import { TransactionResult } from 'truffle-contract'
import { AcceptPaymentResponse } from './lib/accept_payment_response'
import { AcceptTokenResponse } from './lib/accept_token_response'
import NextPaymentResult from './lib/NextPaymentResult'
import ChannelId from './lib/ChannelId'
import MachinomyOptions from './lib/MachinomyOptions'

export {
  Payment,
  PaymentChannel,
  BuyResult,
  Machinomy,
  BuyOptions,
  TransactionResult,
  PaymentRequired,
  AcceptPaymentResponse,
  AcceptTokenResponse,
  NextPaymentResult,
  ChannelId,
  MachinomyOptions
}

export default Machinomy
