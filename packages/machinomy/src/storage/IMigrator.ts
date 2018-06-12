export default interface IMigrator {
  isLatest (): Promise<boolean>
  sync (n?: any): Promise<void>
}
