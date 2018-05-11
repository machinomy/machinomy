// tslint:disable-next-line:strict-type-predicates
export default (typeof fetch !== 'undefined') ? { fetch: fetch } : { fetch: require('fetch-ponyfill') }
