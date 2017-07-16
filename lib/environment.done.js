'use strict'

/**
 * Detect if run inside a browser.
 * @return {boolean}
 */
const isBrowser = () => {
  return typeof navigator !== 'undefined'
}

/**
 * Detect if run inside a Node.js.
 * @return {boolean}
 */
const isNode = () => {
  return typeof navigator === 'undefined'
}

module.exports = {
  isBrowser: isBrowser,
  isNode: isNode
}
