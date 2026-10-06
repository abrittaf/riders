import { useTranslation } from 'react-i18next'
import { Panel } from '../app-shell/Panel.tsx'
import type { RiderProfile, SignedInRider } from '../backend/index.ts'

export function AccountPanel({
  rider,
  profile,
  onSignOut,
  onClose,
}: {
  rider: SignedInRider
  profile: RiderProfile | null
  onSignOut: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()

  return (
    <Panel title={t('riderAccount.accountTitle')} onClose={onClose}>
      <p>
        {t('riderAccount.signedInAs', {
          name: profile?.displayName ?? rider.accountName ?? rider.id,
        })}
      </p>
      <button type="button" onClick={onSignOut}>
        {t('riderAccount.signOut')}
      </button>
    </Panel>
  )
}
