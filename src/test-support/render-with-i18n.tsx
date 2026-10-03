import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../i18n/i18n.ts'
import { LocalStorageLanguagePreference } from '../i18n/language-preference.ts'

export function renderInSpanish(ui: ReactElement) {
  const i18n = createI18n({
    deviceLanguages: ['es-AR'],
    preference: new LocalStorageLanguagePreference(window.localStorage),
  })
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>)
}
