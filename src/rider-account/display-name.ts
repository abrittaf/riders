export const DISPLAY_NAME_MIN_LENGTH = 2
export const DISPLAY_NAME_MAX_LENGTH = 24

export type DisplayNameError = 'required' | 'tooShort' | 'tooLong'

export function validateDisplayName(name: string): DisplayNameError | null {
  const trimmed = name.trim()
  if (trimmed.length === 0) return 'required'
  if (trimmed.length < DISPLAY_NAME_MIN_LENGTH) return 'tooShort'
  if (trimmed.length > DISPLAY_NAME_MAX_LENGTH) return 'tooLong'
  return null
}

/** El nombre de la cuenta de Google, recortado al largo permitido, como propuesta editable. */
export function proposeDisplayName(accountName: string | null): string {
  return (accountName ?? '').trim().slice(0, DISPLAY_NAME_MAX_LENGTH)
}
