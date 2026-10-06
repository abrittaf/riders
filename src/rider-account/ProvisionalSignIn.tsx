import { useTranslation } from 'react-i18next'
import type { RiderAccountService } from '../backend/index.ts'
import { useRiderSession } from './use-rider-session.ts'

/** Ingreso provisorio para verificar el flujo con Google en el celular; lo reemplaza la tarea 3.1. */
export function ProvisionalSignIn({
  riderAccount,
}: {
  riderAccount: RiderAccountService
}) {
  const { t } = useTranslation()
  const session = useRiderSession(riderAccount)

  if (session.status === 'resolving') return null

  return (
    <aside className="provisional-sign-in">
      {session.status === 'signed-in' ? (
        <>
          <span role="status">
            {t('riderAccount.signedInAs', {
              name: session.rider.accountName ?? session.rider.id,
            })}
          </span>
          <button type="button" onClick={() => void riderAccount.signOut()}>
            {t('riderAccount.signOut')}
          </button>
        </>
      ) : (
        <button type="button" onClick={() => void riderAccount.signIn()}>
          {t('riderAccount.signInWithGoogle')}
        </button>
      )}
    </aside>
  )
}
