export default interface Engine {
  connect (): Promise<any>
  isConnected (): boolean
  close (): Promise<any>
  drop (): Promise<any>
  exec (cb: Function): Promise<any>
}
