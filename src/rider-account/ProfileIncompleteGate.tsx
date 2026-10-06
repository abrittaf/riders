import { useTranslation } from 'react-i18next'

/**
 * Paso obligatorio tras el primer ingreso: el Rider no sigue hasta completar el perfil o cerrar
 * sesión. El formulario llega con la tarea 5.1.
 */
export function ProfileIncompleteGate({
  onSignOut,
}: {
  onSignOut: () => void
}) {
  const { t } = useTranslation()

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
      </div>
    </section>
  )
}
