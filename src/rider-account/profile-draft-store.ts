import { type AvatarOptions, isAvatarOptions } from '../avatar/index.ts'

/** Lo que el Rider cargó del perfil inicial, tal cual lo escribió, para retomarlo si abandona a medias. */
export interface ProfileDraft {
  displayName: string
  avatar: AvatarOptions
  model: string
  rangeKm: string
}

export interface ProfileDraftStore {
  load(riderId: string): ProfileDraft | null
  save(riderId: string, draft: ProfileDraft): void
  clear(riderId: string): void
}

export class LocalStorageProfileDraftStore implements ProfileDraftStore {
  private readonly storage: Storage

  constructor(storage: Storage) {
    this.storage = storage
  }

  load(riderId: string): ProfileDraft | null {
    const stored = this.storage.getItem(this.key(riderId))
    if (stored === null) return null
    try {
      const parsed: unknown = JSON.parse(stored)
      return isProfileDraft(parsed) ? parsed : null
    } catch {
      return null
    }
  }

  save(riderId: string, draft: ProfileDraft): void {
    this.storage.setItem(this.key(riderId), JSON.stringify(draft))
  }

  clear(riderId: string): void {
    this.storage.removeItem(this.key(riderId))
  }

  private key(riderId: string): string {
    return `riders.profileDraft.${riderId}`
  }
}

function isProfileDraft(value: unknown): value is ProfileDraft {
  if (typeof value !== 'object' || value === null) return false
  const draft = value as Record<string, unknown>
  return (
    typeof draft.displayName === 'string' &&
    isAvatarOptions(draft.avatar) &&
    typeof draft.model === 'string' &&
    typeof draft.rangeKm === 'string'
  )
}
