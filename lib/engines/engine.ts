import Promise = require('bluebird')

interface kind {
  kind: string
}

export default interface Engine {
  find<A> (query: {kind: string}): Promise<Array<A>>
  findOne<A> (query: {kind: string}): Promise<A|null>
  insert (document: {kind: string}): Promise<void>
  update (query: {kind: string}, update: object): Promise<void>
}
