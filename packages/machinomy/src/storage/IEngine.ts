import IMigrator from './IMigrator'

export default interface IEngine {
  connect (): Promise<void>
  isConnected (): boolean
  close (): Promise<void>
  drop (): Promise<void>
  migrate (): IMigrator
}
