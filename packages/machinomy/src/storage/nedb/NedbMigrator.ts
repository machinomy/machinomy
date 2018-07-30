import IMigrations from '../IMigrations'

export default class NedbMigrator implements IMigrations {
  async isLatest (): Promise<boolean> {
    return true
  }

  async sync (n?: any): Promise<void> {
    return
  }
}
