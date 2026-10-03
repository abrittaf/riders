import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { chooseLanguage } from '../i18n/i18n.ts'
import type { LanguagePreference } from '../i18n/language-preference.ts'
import {
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from '../i18n/languages.ts'

export function LanguageSelector({
  preference,
}: {
  preference: LanguagePreference
}) {
  const { t, i18n } = useTranslation()
  const selectId = useId()

  return (
    <div className="field">
      <label htmlFor={selectId}>{t('options.language')}</label>
      <select
        id={selectId}
        value={i18n.language}
        onChange={(event) =>
          void chooseLanguage(
            i18n,
            preference,
            event.target.value as SupportedLanguage,
          )
        }
      >
        {SUPPORTED_LANGUAGES.map((language) => (
          <option key={language} value={language}>
            {t(`languages.${language}`)}
          </option>
        ))}
      </select>
    </div>
  )
}
