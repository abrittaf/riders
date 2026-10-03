import { useTranslation } from 'react-i18next'
import type { LanguagePreference } from '../i18n/language-preference.ts'
import { LanguageSelector } from './LanguageSelector.tsx'
import { Panel } from './Panel.tsx'

export function OptionsPanel({
  languagePreference,
  onClose,
}: {
  languagePreference: LanguagePreference
  onClose: () => void
}) {
  const { t } = useTranslation()

  return (
    <Panel title={t('options.title')} onClose={onClose}>
      <LanguageSelector preference={languagePreference} />
    </Panel>
  )
}
