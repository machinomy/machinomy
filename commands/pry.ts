import * as channel from '../lib//channel'
import * as transport from '../lib/transport'
import * as configuration from '../lib/configuration'
import Storage from '../lib/storage'
import Sender from '../lib/sender'
import Web3 = require('web3')
import mongo from '../lib/mongo'

const pry = (uri: string) => {
  let settings = configuration.sender()
  let _transport = transport.build()
  let provider = configuration.currentProvider()
  let web3 = new Web3(provider)
  let storage = new Storage(web3, settings.databaseFile, 'sender', true, settings.engine)
  let contract = channel.contract(web3)
  let startPry = () => {
    if (settings.account) {
      let client = new Sender(web3, settings.account, contract, _transport, storage)
      client.pry(uri).then(paymentRequired => {
        console.log(paymentRequired)
        if (settings.engine === 'mongo') {
          mongo.db().close()
        }
      }).catch(error => {
        console.error(error)
        if (settings.engine === 'mongo') {
          mongo.db().close()
        }
      })
    }
  }
  if (settings.engine === 'mongo') {
    mongo.connectToServer().then(() => {
      startPry()
    })
  } else {
    startPry()
  }
}

export default pry
