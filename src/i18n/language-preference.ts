export interface LanguagePreference {
  read(): string | null
  write(language: string): void
}

const STORAGE_KEY = 'riders.language'

export class LocalStorageLanguagePreference implements LanguagePreference {
  private readonly storage: Storage

  constructor(storage: Storage) {
    this.storage = storage
  }

  read(): string | null {
    return this.storage.getItem(STORAGE_KEY)
  }

  write(language: string): void {
    this.storage.setItem(STORAGE_KEY, language)
  }
}
