import IMigrator from '../IMigrator'

export default class NedbMigrator implements IMigrator {
  async isLatest (): Promise<boolean> {
    return true
  }

  async sync (n?: any): Promise<void> {
    return
  }
}
