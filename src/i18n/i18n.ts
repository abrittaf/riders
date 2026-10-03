import i18next, { type i18n } from 'i18next'
import { initReactI18next } from 'react-i18next'
import type { LanguagePreference } from './language-preference.ts'
import {
  DEFAULT_LANGUAGE,
  resolveInitialLanguage,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from './languages.ts'
import en from './locales/en.json'
import esAR from './locales/es-AR.json'

export const TRANSLATIONS: Record<SupportedLanguage, typeof esAR> = {
  'es-AR': esAR,
  en,
}

export function createI18n(input: {
  deviceLanguages: readonly string[]
  preference: LanguagePreference
}): i18n {
  const instance = i18next.createInstance()
  void instance.use(initReactI18next).init({
    lng: resolveInitialLanguage({
      storedChoice: input.preference.read(),
      deviceLanguages: input.deviceLanguages,
    }),
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    resources: {
      'es-AR': { translation: esAR },
      en: { translation: en },
    },
    interpolation: { escapeValue: false },
    initAsync: false,
  })
  return instance
}

export async function chooseLanguage(
  instance: i18n,
  preference: LanguagePreference,
  language: SupportedLanguage,
): Promise<void> {
  preference.write(language)
  await instance.changeLanguage(language)
}
