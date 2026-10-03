import { useTranslation } from 'react-i18next'
import { useIsOnline } from './online-context.ts'

export function ConnectivityIndicator() {
  const { t } = useTranslation()
  const isOnline = useIsOnline()

  if (isOnline) return null
  return (
    <p className="connectivity-indicator" role="status">
      {t('connectivity.offline')}
    </p>
  )
}
