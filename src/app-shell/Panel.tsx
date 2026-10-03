import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

export function Panel({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const { t } = useTranslation()

  return (
    <section className="panel" role="dialog" aria-label={title}>
      <header className="panel-header">
        <h2>{title}</h2>
        <button type="button" onClick={onClose}>
          {t('nav.close')}
        </button>
      </header>
      <div className="panel-body">{children}</div>
    </section>
  )
}
