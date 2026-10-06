import { useTranslation } from 'react-i18next'
import type { RiderSession } from '../backend/index.ts'
import { OnlineOnlyButton } from '../connectivity/OnlineOnlyButton.tsx'

/** Acceso a la cuenta desde la barra de la app: ingresar, o abrir la cuenta del Rider identificado. */
export function AccountButton({
  session,
  onSignIn,
  onOpenAccount,
}: {
  session: RiderSession
  onSignIn: () => void
  onOpenAccount: () => void
}) {
  const { t } = useTranslation()

  if (session.status === 'resolving') return null
  if (session.status === 'signed-out') {
    return (
      <OnlineOnlyButton
        onClick={onSignIn}
        unavailableMessage={t('riderAccount.signInRequiresConnection')}
      >
        {t('riderAccount.signIn')}
      </OnlineOnlyButton>
    )
  }
  return (
    <button type="button" onClick={onOpenAccount}>
      {session.profile?.displayName ??
        session.rider.accountName ??
        t('riderAccount.account')}
    </button>
  )
}
