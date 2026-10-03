export const SUPPORTED_LANGUAGES = ['es-AR', 'en'] as const

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export const DEFAULT_LANGUAGE: SupportedLanguage = 'es-AR'

function primarySubtag(languageTag: string): string {
  return languageTag.toLowerCase().split('-')[0] ?? ''
}

export function matchSupportedLanguage(
  languageTag: string,
): SupportedLanguage | null {
  const exactMatch = SUPPORTED_LANGUAGES.find(
    (supported) => supported.toLowerCase() === languageTag.toLowerCase(),
  )
  if (exactMatch) return exactMatch

  return (
    SUPPORTED_LANGUAGES.find(
      (supported) => primarySubtag(supported) === primarySubtag(languageTag),
    ) ?? null
  )
}

export function resolveInitialLanguage(input: {
  storedChoice: string | null
  deviceLanguages: readonly string[]
}): SupportedLanguage {
  const storedLanguage =
    input.storedChoice === null
      ? null
      : matchSupportedLanguage(input.storedChoice)
  if (storedLanguage) return storedLanguage

  for (const deviceLanguage of input.deviceLanguages) {
    const supported = matchSupportedLanguage(deviceLanguage)
    if (supported) return supported
  }
  return DEFAULT_LANGUAGE
}
