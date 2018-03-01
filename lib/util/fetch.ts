let fetch: any

if (typeof (global as any).fetch === 'undefined') {
  const fetchPonyfill = require('fetch-ponyfill')
  fetch = fetchPonyfill().fetch
} else {
  fetch = (global as any).fetch
}

export const fetcher = {
  fetch (...args: any[]): Promise<any> {
    return fetch(...args)
  }
}

export default fetcher
