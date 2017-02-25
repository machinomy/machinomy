'use strict'

const machinomy = require('../index')

const web3 = machinomy.web3

const claim = function (storage, contract, paymentChannel) {
  let channelId = paymentChannel.channelId
  storage.lastPaymentDoc(channelId, function (error, paymentDoc) {
    if (error) throw error
    var canClaim = contract.canClaim(channelId, paymentDoc.value, Number(paymentDoc.v), paymentDoc.r, paymentDoc.s)
    if (canClaim) {
      contract.claim(paymentChannel.receiver, paymentChannel.channelId, paymentDoc.value, Number(paymentDoc.v), paymentDoc.r, paymentDoc.s, function (error, value) {
        if (error) throw error
        console.log('Claimed ' + value + ' out of ' + paymentChannel.value + ' from channel ' + channelId)
      })
    } else {
      console.log('Can not claim ' + paymentDoc.value + ' from channel ' + channelId)
    }
  })
}

var startSettle = function (settings, contract, paymentChannel) {
  var canStartSettle = contract.canStartSettle(settings.account, paymentChannel.channelId)
  if (canStartSettle) {
    contract.startSettle(settings.account, paymentChannel.channelId, paymentChannel.spent, function (error) {
      if (error) throw error
      console.log('Start settling channel ' + paymentChannel.channelId)
    })
  } else {
    console.log('Can not start settling channel ' + paymentChannel.channelId)
  }
}

var finishSettle = function (settings, contract, paymentChannel) {
  if (contract.canFinishSettle(settings.account, paymentChannel.channelId)) {
    contract.finishSettle(settings.account, paymentChannel.channelId, function (error, payment) {
      if (error) throw error
      console.log('Settled to pay ' + payment + ' to ' + paymentChannel.receiver)
    })
  } else {
    var until = contract.getUntil(paymentChannel.channelId)
    console.log('Can not finish settle until ' + until)
  }
}

/**
 * @param {String} channelId
 * @param {Object} options
 */
var close = function (channelId, options) {
  var namespace = options.namespace || 'sender'

  var settings = machinomy.configuration[namespace].call()
  var password = options.parent.password || settings.password

  web3.personal.unlockAccount(settings.account, password, 1000)

  var storage = new machinomy.Storage(settings.databaseFile, namespace)
  var contract = machinomy.contract

  storage._channels.firstById(channelId).then(paymentChannel => {
    var state = contract.getState(channelId)
    switch (state) {
      case 0: // open
        console.log('Channel ' + channelId + ' is open')
        if (settings.account === paymentChannel.sender) {
          startSettle(settings, contract, paymentChannel)
        } else if (settings.account === paymentChannel.receiver) {
          claim(storage, contract, paymentChannel)
        }
        break
      case 1: // settling
        console.log('Channel ' + channelId + ' is settling')
        if (settings.account === paymentChannel.sender) {
          finishSettle(settings, contract, paymentChannel)
        } else if (settings.account === paymentChannel.receiver) {
          claim(storage, contract, paymentChannel)
        }
        break
      case 2: // settled, nothing to do
        console.log('Channel ' + channelId + ' is settled')
        break
      default:
        throw new Error('Unsupported channel state: ' + state)
    }
  }).catch(error => {
    throw error
  })
}

module.exports = close
