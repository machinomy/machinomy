'use strict'

const downloadContent = (callback) => {
  window.BROWSER = true
  window.MACHINOMY_NETWORK = 'ropsten'
  let uri = 'http://localhost:3000/outline'
  window.literate.buy({uri: uri, title: 'Counterpoint: Rebooting The Matrix is good', media: 'The Outline'}, (error, response) => {
    if (error) {
      callback(error, null)
    } else {
      callback(null, response.content)
    }
  })
}

$(() => {
  let readMoreElement = $('.truncater__read-more')
  readMoreElement.click(() => {
    window.literate.requestState((error, state) => {
      if (state.locked) {
        alert('Please, unlock the Literate Payments Wallet')
      } else {
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
      }
    })
  })
})
