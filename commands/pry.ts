import machinomy from '../index'
import Storage from '../lib/storage'
import Sender from '../lib/sender'
import Web3 = require('web3')

const pry = (uri: string) => {
  let settings = machinomy.configuration.sender()
  let transport = machinomy.transport.build()
  let provider = machinomy.configuration.currentProvider()
  let web3 = new Web3(provider)
  let storage = new Storage(web3, settings.databaseFile, 'sender')

  let contract = machinomy.contract(web3)
  if (settings.account) {
    let client = new Sender(web3, settings.account, contract, transport, storage)
    client.pry(uri).then(paymentRequired => {
      console.log(paymentRequired)
    }).catch(error => {
      console.error(error)
    })
  }
}

export default pry
