export default interface Engine {
  connect (): Promise<any>
  close (): Promise<any>
  drop (): Promise<any>
  exec (cb: Function): Promise<any>
}
