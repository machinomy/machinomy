'use strict'

const machinomy = require('../index')

const buy = (uri, command) => {
  let settings = machinomy.configuration.sender()
  let password = command.parent.password || settings.password

  machinomy.buy(uri, settings.account, password).then(contents => {
    console.log(contents)
  }).catch(error => {
    console.error(error)
  })
}

module.exports = buy
