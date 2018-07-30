export default interface IMigrations {
  isLatest (): Promise<boolean>
  sync (n?: any): Promise<void>
}
