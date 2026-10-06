import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { proposeRandomAvatar } from '../avatar/index.ts'
import type { RiderAccountService, SignedInRider } from '../backend/index.ts'
import { proposeDisplayName } from './display-name.ts'
import type { ProfileDraft, ProfileDraftStore } from './profile-draft-store.ts'
import { ProfileForm } from './ProfileForm.tsx'

/**
 * Paso obligatorio tras el primer ingreso: el Rider no sigue hasta completar el perfil o cerrar
 * sesión. Lo que carga se conserva en el celular por si abandona a medias.
 */
export function ProfileSetupScreen({
  rider,
  riderAccount,
  drafts,
  onSignOut,
}: {
  rider: SignedInRider
  riderAccount: RiderAccountService
  drafts: ProfileDraftStore
  onSignOut: () => void
}) {
  const { t } = useTranslation()
  const [initial] = useState<ProfileDraft>(
    () =>
      drafts.load(rider.id) ?? {
        displayName: proposeDisplayName(rider.accountName),
        avatar: proposeRandomAvatar(),
        model: '',
        rangeKm: '',
      },
  )

  return (
    <section
      className="panel"
      role="dialog"
      aria-label={t('riderAccount.completeProfile.title')}
    >
      <header className="panel-header">
        <h2>{t('riderAccount.completeProfile.title')}</h2>
        <button type="button" onClick={onSignOut}>
          {t('riderAccount.signOut')}
        </button>
      </header>
      <div className="panel-body">
        <p>{t('riderAccount.completeProfile.intro')}</p>
        <ProfileForm
          initial={initial}
          submitLabel={t('riderAccount.completeProfile.submit')}
          onChange={(draft) => drafts.save(rider.id, draft)}
          onSubmit={async (profile, vehicle) => {
            await riderAccount.saveProfile(profile, vehicle)
            drafts.clear(rider.id)
          }}
        />
      </div>
    </section>
  )
}
