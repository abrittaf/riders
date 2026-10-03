import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Panel } from '../app-shell/Panel.tsx'
import type { MapAttribution as Attribution } from '../map-platform/index.ts'

/** Atribución permanente sobre el mapa, con acceso al detalle de cada fuente. */
export function MapAttribution({
  attributions,
}: {
  attributions: readonly Attribution[]
}) {
  const { t } = useTranslation()
  const [showingSources, setShowingSources] = useState(false)
  const names = attributions.map((attribution) => attribution.name).join(' · ')

  return (
    <>
      <button
        type="button"
        className="map-attribution"
        aria-label={t('map.sources.open')}
        onClick={() => setShowingSources(true)}
      >
        © {names}
      </button>
      {showingSources && (
        <Panel
          title={t('map.sources.title')}
          onClose={() => setShowingSources(false)}
        >
          <ul className="map-sources">
            {attributions.map((attribution) => (
              <li key={attribution.name}>
                <a href={attribution.url} target="_blank" rel="noreferrer">
                  {attribution.name}
                </a>
                <p>{t(attribution.descriptionKey)}</p>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  )
}
