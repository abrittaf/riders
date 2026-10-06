import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Panel } from '../app-shell/Panel.tsx'
import { Avatar } from '../avatar/index.ts'
import type {
  RiderAccountService,
  RiderProfile,
  SignedInRider,
} from '../backend/index.ts'
import type { Vehicle } from '../rider-vehicles/vehicle.ts'
import { ProfileForm } from './ProfileForm.tsx'

export function AccountPanel({
  rider,
  profile,
  vehicle,
  riderAccount,
  onSignOut,
  onClose,
}: {
  rider: SignedInRider
  profile: RiderProfile
  vehicle: Vehicle | null
  riderAccount: RiderAccountService
  onSignOut: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)

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
        </div>
      )}
    </Panel>
  )
}
