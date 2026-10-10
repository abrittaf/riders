import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Panel } from '../app-shell/Panel.tsx'
import type { MapAttribution } from '../map-platform/index.ts'

/**
 * Atribución del motor de ruteo y del buscador en la pantalla del Roadmap (spec «Atribución del
 * motor de ruteo»), con el detalle de cada fuente. Los nombres y textos salen de los proveedores.
 */
export function RoadmapSources({
  attributions,
}: {
  attributions: readonly MapAttribution[]
}) {
  const { t } = useTranslation()
  const [showingSources, setShowingSources] = useState(false)
  const names = [...new Set(attributions.map((a) => a.name))].join(' · ')

  return (
    <>
      <button
        type="button"
        className="roadmap-sources"
        aria-label={t('roadmaps.sources.open')}
        onClick={() => setShowingSources(true)}
      >
        © {names}
      </button>
      {showingSources && (
        <Panel
          title={t('roadmaps.sources.title')}
          onClose={() => setShowingSources(false)}
        >
          <ul className="map-sources">
            {attributions.map((attribution) => (
              <li key={`${attribution.name}|${attribution.url}`}>
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
