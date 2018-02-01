export default interface Serde<T> {
  serialize (obj: T): object
  deserialize (data: any): T
}
