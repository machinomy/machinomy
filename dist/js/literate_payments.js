'use strict'

const downloadContent = (callback) => {
  window.BROWSER = true
  window.MACHINOMY_NETWORK = 'development'
  let account = web3.eth.defaultAccount
  let uri = 'http://localhost:3000/outline'
  // FIXME let settings = machinomy.configuration.sender()
  let _transport = machinomy.transport.build()
  let _storage = machinomy.storage.build(web3, 'sender', 'sender')
  let _contract = machinomy.contract(web3)
  let client = machinomy.sender.build(web3, account, _contract, _transport, _storage)
  client.buy(uri, {'Access-Control-Request-Headers': 'x-requested-with'}).then(response => {
    callback(null, response.body)
  }).catch(error => {
    callback(error, null)
  })
}

$(() => {
  let readMoreElement = $('.truncater__read-more')
  readMoreElement.click(() => {
    downloadContent((error, content) => {
      if (error) {
        throw error
      } else {
        let container = readMoreElement.parent()
        container.removeClass('truncater')
        let body = container.find('.post__body')
        body.append(content)
      }
    })
  })
})
