import * as configuration from 'machinomy/lib/configuration'
import * as Web3 from 'web3'
import Machinomy from 'machinomy'

async function pry (uri: string) {
  const settings = configuration.sender()
  const provider = configuration.currentProvider()
  const web3 = new Web3(provider)

  if (!settings.account) {
    return
  }

  const machinomy = new Machinomy(settings.account, web3, settings)

  try {
    let res = await machinomy.pry(uri)
    console.log(res)
    await machinomy.shutdown()
  } catch (error) {
    console.error('Failed to cleanly pry:')
    console.error(error)
    process.exit(1)
  }
}

export default pry
