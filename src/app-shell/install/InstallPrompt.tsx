import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { InstallOffer, InstallPlatform } from './install-platform.ts'

export function InstallPrompt({ platform }: { platform: InstallPlatform }) {
  const { t } = useTranslation()
  const [offer, setOffer] = useState<InstallOffer | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => platform.subscribeToInstallOffer(setOffer), [platform])

  if (dismissed || platform.isRunningInstalled()) return null

  const dismissButton = (
    <button type="button" onClick={() => setDismissed(true)}>
      {t('install.dismiss')}
    </button>
  )

  if (offer) {
    return (
      <aside className="install-prompt">
        <p>{t('install.offer.text')}</p>
        <div className="install-prompt-actions">
          <button type="button" onClick={() => void offer.accept()}>
            {t('install.offer.accept')}
          </button>
          {dismissButton}
        </div>
      </aside>
    )
  }

  if (platform.requiresManualInstallSteps()) {
    return (
      <aside className="install-prompt">
        <h2>{t('install.ios.title')}</h2>
        <ol>
          <li>{t('install.ios.stepShare')}</li>
          <li>{t('install.ios.stepAddToHome')}</li>
          <li>{t('install.ios.stepConfirm')}</li>
        </ol>
        <div className="install-prompt-actions">{dismissButton}</div>
      </aside>
    )
  }

  return null
}
