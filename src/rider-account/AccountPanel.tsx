import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Panel } from '../app-shell/Panel.tsx'
import { Avatar } from '../avatar/index.ts'
import type {
  RiderAccountService,
  RiderProfile,
  SignedInRider,
} from '../backend/index.ts'
import { OnlineOnlyButton } from '../connectivity/OnlineOnlyButton.tsx'
import type { Vehicle } from '../rider-vehicles/vehicle.ts'
import { ProfileForm } from './ProfileForm.tsx'

type DeletionStep = 'idle' | 'confirming' | 'requires-recent-sign-in'

export function AccountPanel({
  rider,
  profile,
  vehicle,
  pendingSync,
  riderAccount,
  onSignOut,
  onClose,
}: {
  rider: SignedInRider
  profile: RiderProfile
  vehicle: Vehicle | null
  pendingSync: boolean
  riderAccount: RiderAccountService
  onSignOut: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [deletion, setDeletion] = useState<DeletionStep>('idle')

  async function deleteAccount() {
    const result = await riderAccount.deleteAccount()
    if (result.status === 'requires-recent-sign-in') {
      setDeletion('requires-recent-sign-in')
      return
    }
    onClose()
  }

  return (
    <Panel title={t('riderAccount.accountTitle')} onClose={onClose}>
      {editing ? (
        <ProfileForm
          initial={{
            displayName: profile.displayName,
            avatar: profile.avatar,
            model: vehicle?.model ?? '',
            rangeKm: vehicle ? String(vehicle.rangeKm) : '',
          }}
          submitLabel={t('profile.save')}
          onSubmit={async (newProfile, newVehicle) => {
            await riderAccount.saveProfile(newProfile, newVehicle)
            setEditing(false)
          }}
        />
      ) : (
        <div className="profile-summary">
          <Avatar
            options={profile.avatar}
            label={t('profile.avatarOf', { name: profile.displayName })}
          />
          <dl>
            <dt>{t('profile.displayName')}</dt>
            <dd>{profile.displayName}</dd>
            <dt>{t('vehicle.model')}</dt>
            <dd>{vehicle?.model ?? t('vehicle.missing')}</dd>
            <dt>{t('vehicle.rangeKm')}</dt>
            <dd>
              {vehicle
                ? t('vehicle.rangeWithUnit', { value: vehicle.rangeKm })
                : t('vehicle.missing')}
            </dd>
          </dl>
          {pendingSync && (
            <p className="pending-sync" role="status">
              {t('riderAccount.pendingSync')}
            </p>
          )}
          <button type="button" onClick={() => setEditing(true)}>
            {t('profile.edit')}
          </button>
          <button type="button" onClick={onSignOut}>
            {t('riderAccount.signOut')}
          </button>
          <p>
            {t('riderAccount.signedInAs', {
              name: rider.accountName ?? rider.id,
            })}
          </p>
          <section
            className="account-deletion"
            aria-label={t('riderAccount.deleteAccount.title')}
          >
            {deletion === 'idle' && (
              <OnlineOnlyButton
                onClick={() => setDeletion('confirming')}
                unavailableMessage={t(
                  'riderAccount.deleteAccount.requiresConnection',
                )}
              >
                {t('riderAccount.deleteAccount.action')}
              </OnlineOnlyButton>
            )}
            {deletion === 'confirming' && (
              <div
                className="notice"
                role="alertdialog"
                aria-label={t('riderAccount.deleteAccount.confirmTitle')}
              >
                <p>{t('riderAccount.deleteAccount.confirmText')}</p>
                <div className="notice-actions">
                  <OnlineOnlyButton
                    onClick={() => void deleteAccount()}
                    unavailableMessage={t(
                      'riderAccount.deleteAccount.requiresConnection',
                    )}
                  >
                    {t('riderAccount.deleteAccount.confirm')}
                  </OnlineOnlyButton>
                  <button type="button" onClick={() => setDeletion('idle')}>
                    {t('riderAccount.deleteAccount.cancel')}
                  </button>
                </div>
              </div>
            )}
            {deletion === 'requires-recent-sign-in' && (
              <div className="notice" role="alert">
                <p>{t('riderAccount.deleteAccount.reconfirmText')}</p>
                <div className="notice-actions">
                  <OnlineOnlyButton
                    onClick={() =>
                      void riderAccount.reconfirmIdentityAndDeleteAccount()
                    }
                    unavailableMessage={t(
                      'riderAccount.deleteAccount.requiresConnection',
                    )}
                  >
                    {t('riderAccount.deleteAccount.reconfirm')}
                  </OnlineOnlyButton>
                  <button type="button" onClick={() => setDeletion('idle')}>
                    {t('riderAccount.deleteAccount.cancel')}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </Panel>
  )
}
