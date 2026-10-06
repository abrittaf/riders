import { useTranslation } from 'react-i18next'
import { OnlineOnlyButton } from '../connectivity/OnlineOnlyButton.tsx'

export function SignInFailedNotice({
  onRetry,
  onDismiss,
}: {
  onRetry: () => void
  onDismiss: () => void
}) {
  const { t } = useTranslation()

  return (
    <aside className="notice" role="alert">
      <p>{t('riderAccount.signInFailed')}</p>
      <div className="notice-actions">
        <OnlineOnlyButton
          onClick={onRetry}
          unavailableMessage={t('riderAccount.signInRequiresConnection')}
        >
          {t('riderAccount.retrySignIn')}
        </OnlineOnlyButton>
        <button type="button" onClick={onDismiss}>
          {t('riderAccount.dismiss')}
        </button>
      </div>
    </aside>
  )
}
