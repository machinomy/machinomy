import * as configuration from '../lib/configuration'
import Web3 = require('web3')
import { PaymentRequired } from '../lib/transport'
import Machinomy from '../index'

const pry = (uri: string) => {
  const settings = configuration.sender()
  const provider = configuration.currentProvider()
  const web3 = new Web3(provider)

  if (!settings.account) {
    return
  }

  const machinomy = new Machinomy(settings.account, web3, settings)

  machinomy.pry(uri).then((res: PaymentRequired) => console.log(res))
    .catch((e: any) => console.error(e))
    .then(() => machinomy.shutdown())
    .catch((e: any) => {
      console.error('Failed to cleanly shut down:')
      console.error(e)
      process.exit(1)
    })
}

export default pry
