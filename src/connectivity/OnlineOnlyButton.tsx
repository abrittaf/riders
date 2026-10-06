import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useIsOnline } from './online-context.ts'

/** Botón de una acción que requiere conectividad: sin conexión queda señalado como no disponible. */
export function OnlineOnlyButton({
  onClick,
  disabled = false,
  unavailableMessage,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  /** Explicación propia de la acción; por defecto, el aviso genérico. */
  unavailableMessage?: string
  children: ReactNode
}) {
  const { t } = useTranslation()
  const isOnline = useIsOnline()

  return (
    <span className="online-only-action">
      <button type="button" onClick={onClick} disabled={disabled || !isOnline}>
        {children}
      </button>
      {!isOnline && (
        <small className="unavailable-offline">
          {unavailableMessage ?? t('connectivity.unavailableOffline')}
        </small>
      )}
    </span>
  )
}
