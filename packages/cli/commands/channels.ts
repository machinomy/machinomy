import * as configuration from 'machinomy/lib/configuration'
import Machinomy from 'machinomy'
import * as Web3 from 'web3'
import { PaymentChannelSerde } from 'machinomy/lib/PaymentChannel'

async function channels (): Promise<void> {
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
