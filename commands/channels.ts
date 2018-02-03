import * as configuration from '../lib/configuration'
import Machinomy from '../index'
import Web3 = require('web3')
import { PaymentChannelSerde } from '../lib/paymentChannel'

function channels (): void {
  const settings = configuration.sender()
  const provider = configuration.currentProvider()
  const web3 = new Web3(provider)

  if (!settings.account) {
    return
  }

  const machinomy = new Machinomy(settings.account, web3, settings)

  machinomy.channels().then((channels: any) => console.log(channels.map(PaymentChannelSerde.instance.serialize)))
    .catch((e: any) => console.log(e))
    .then(() => machinomy.shutdown())
    .catch((e: any) => {
      console.error('Failed to cleanly shut down:')
      console.error(e)
      process.exit(1)
    })
}

export default channels
