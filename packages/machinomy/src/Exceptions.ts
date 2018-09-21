export class PaymentNotValid extends Error {
  constructor () {
    super('Invalid payment.')
  }
}
