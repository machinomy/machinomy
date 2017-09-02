import machinomy from '../index'
import Storage from '../lib/storage'
import Sender from '../lib/sender'
import Web3 = require('web3')
import mongo from '../lib/mongo'

const pry = (uri: string) => {
  let settings = machinomy.configuration.sender()
  let transport = machinomy.transport.build()
  let provider = machinomy.configuration.currentProvider()
  let web3 = new Web3(provider)
  let storage = new Storage(web3, settings.databaseFile, 'sender', true, settings.engine)
  let contract = machinomy.contract(web3)
  let startPry = () => {
    if (settings.account) {
      let client = new Sender(web3, settings.account, contract, transport, storage)
      client.pry(uri).then(paymentRequired => {
        console.log(paymentRequired)
      }).catch(error => {
        console.error(error)
      })
    }
  }
  if (settings.engine === 'mongo') {
    mongo.connectToServer(() => {
      startPry()
    })
  } else {
    startPry()
  }
}

export default pry
