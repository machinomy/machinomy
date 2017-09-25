import machinomy from '../index'
import Storage from '../lib/storage'
import Web3 = require('web3')
import CommandPrompt from './CommandPrompt'
import { ChannelContract, PaymentChannel } from '../lib/channel'
import BigNumber = require('bignumber.js')
import mongo from '../lib/mongo'

import { Broker, BrokerToken } from 'machinomy-contracts/types/index'
import { BrokerContract, BrokerTokenContract } from 'machinomy-contracts'

let provider = machinomy.configuration.currentProvider()
let web3 = new Web3(provider)

function claim (storage: Storage, contract: ChannelContract, paymentChannel: PaymentChannel) {
  let channelId = paymentChannel.channelId
  storage.payments.firstMaximum(channelId).then((paymentDoc: any) => {
    let canClaim = contract.canClaim(channelId, paymentDoc.value, Number(paymentDoc.v), paymentDoc.r, paymentDoc.s)
    if (canClaim) {
      contract.claim(paymentChannel.receiver, paymentChannel.channelId, paymentDoc.value, Number(paymentDoc.v), paymentDoc.r, paymentDoc.s).then(value => {
        console.log('Claimed ' + value + ' out of ' + paymentChannel.value + ' from channel ' + channelId)
      }).catch(error => {
        throw error
      })
    } else {
      console.log('Can not claim ' + paymentDoc.value + ' from channel ' + channelId)
    }
  }).catch((error: any) => {
    throw error
  })
}

function startSettle (account: string, contract: ChannelContract, paymentChannel: PaymentChannel): void {
  contract.canStartSettle(account, paymentChannel.channelId).then(canStartSettle => {
    if (canStartSettle) {
      let spent = new BigNumber(paymentChannel.spent)
      // contract.startSettle(account, paymentChannel.channelId, spent).then(() => {
      //   console.log('Start settling channel ' + paymentChannel.channelId)
      // }).catch((error: any) => {
      //   throw error
      // })

      if (paymentChannel.contractAddress) {
        BrokerTokenContract.deployed().then((deployed: BrokerToken.Contract) => {
          deployed.startSettle(account, paymentChannel.channelId, spent).then(() => {
            console.log('Start settling channel ' + paymentChannel.channelId)
          })
        }).catch((e: Error) => {
          throw e
        })
      } else {
        BrokerContract.deployed().then((deployed: Broker.Contract) => {
          console.log('Start settling channel ' + paymentChannel.channelId)
        }).catch((e: Error) => {
          throw e
        })
      }
    } else {
      console.log('Can not start settling channel ' + paymentChannel.channelId)
    }
  })
}

const finishSettle = (account: string, contract: ChannelContract, paymentChannel: PaymentChannel) => {
  if (contract.canFinishSettle(account, paymentChannel.channelId)) {
    contract.finishSettle(account, paymentChannel.channelId).then(payment => {
      console.log('Settled to pay ' + payment + ' to ' + paymentChannel.receiver)
    }).catch((error: any) => {
      throw error
    })
  } else {
    let until = contract.getUntil(paymentChannel.channelId)
    console.log('Can not finish settle until ' + until)
  }
}

function close (channelId: string, options: CommandPrompt): void {
  let namespace = options.namespace || 'sender'
  let settings = machinomy.configuration.sender()
  if (namespace === 'receiver') {
    settings = machinomy.configuration.receiver()
  }

  let password = settings.password
  if (options.parent && options.parent.password) {
    password = options.parent.password
  }

  if (web3.personal && settings.account) {
    // web3.personal.unlockAccount(settings.account, password, 1000)
  }

  let s = new Storage(web3, settings.databaseFile, namespace, true, settings.engine)
  let contract = machinomy.contract(web3)
  let startClose = () => {
    s.channels.firstById(channelId).then(paymentChannel => {
      if (paymentChannel) {
        contract.getState(channelId).then(state => {
          switch (state) {
            case 0: // open
              console.log('Channel ' + channelId + ' is open')
              if (settings.account === paymentChannel.sender) {
                startSettle(settings.account, contract, paymentChannel)
              } else if (settings.account === paymentChannel.receiver) {
                claim(s, contract, paymentChannel)
              }
              break
            case 1: // settling
              console.log('Channel ' + channelId + ' is settling')
              if (settings.account === paymentChannel.sender) {
                finishSettle(settings.account, contract, paymentChannel)
              } else if (settings.account === paymentChannel.receiver) {
                claim(s, contract, paymentChannel)
              }
              break
            case 2: // settled, nothing to do
              console.log('Channel ' + channelId + ' is settled')
              break
            default:
              throw new Error('Unsupported channel state: ' + state)
          }
        })
      } else {
        // Do Nothing
      }
    }).catch(error => {
      throw error
    })
  }
  if (settings.engine === 'mongo'){
    mongo.connectToServer(() => {
      startClose()
    })
  } else {
    startClose()
  }
}

export default close
