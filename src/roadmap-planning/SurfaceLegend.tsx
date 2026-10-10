import { useTranslation } from 'react-i18next'
import type { RoadSurface } from '../map-platform/index.ts'

/** Las clases de D1b en el orden de la referencia, con el trazo que las dibuja sobre el mapa. */
const SURFACE_DASHES: Record<RoadSurface, string | undefined> = {
  paved: undefined,
  compacted: '12 7',
  loose: '3 7',
  unknown: '12 7 3 7',
}

const SURFACE_CLASSES: readonly RoadSurface[] = [
  'paved',
  'compacted',
  'loose',
  'unknown',
]

/** Referencia de estilos: qué superficie significa cada estilo de línea (spec «Referencia de estilos»). */
export function SurfaceLegend() {
  const { t } = useTranslation()
  return (
    <dl className="surface-legend" aria-label={t('roadmaps.legend.title')}>
      {SURFACE_CLASSES.map((surface) => (
        <div key={surface} className="surface-legend-entry">
          <dt>
            <svg
              width="64"
              height="10"
              viewBox="0 0 64 10"
              aria-hidden="true"
              data-surface={surface}
            >
              <line
                x1="2"
                y1="5"
                x2="62"
                y2="5"
                stroke="#c2185b"
                strokeWidth="5"
                strokeDasharray={SURFACE_DASHES[surface]}
              />
            </svg>
          </dt>
          <dd>
            <strong>{t(`roadmaps.legend.${surface}.name`)}</strong>{' '}
            <span>{t(`roadmaps.legend.${surface}.description`)}</span>
          </dd>
        </div>
      ))}
    </dl>
  )
}
