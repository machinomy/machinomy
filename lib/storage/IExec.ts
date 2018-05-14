export default interface IExec<A> {
  exec<B> (fn: (client: A) => B): Promise<B>
}
