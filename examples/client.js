'use strict'

const machinomy = require('../index')

const uri = process.argv.pop()

const settings = machinomy.configuration.sender()
machinomy.buy(uri, settings.account, settings.password).then(contents => {
  console.log(contents)
}).catch(error => {
  console.error(error)
})
