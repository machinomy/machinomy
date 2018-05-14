/**
 * Params returned by buy operation. Generated channel id (or already exists opened channel)
 * and token as a proof of purchase.
 */
export default interface BuyResult {
  channelId: string
  token: string
}
