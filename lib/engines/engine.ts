import Promise = require('bluebird')

export default interface Engine {
  find<A> (query: {}): Promise<Array<A>>
  findOne<A> (query: {}): Promise<A|null>
  insert (document: {}): Promise<void>
  update (query: {}, update: object): Promise<void>
}
