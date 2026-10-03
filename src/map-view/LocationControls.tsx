import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Geolocation, GeolocationState } from '../map-platform/index.ts'

export function LocationControls({
  geolocation,
  state,
  onCenter,
}: {
  geolocation: Geolocation
  state: GeolocationState
  onCenter: () => void
}) {
  const { t } = useTranslation()
  const [deniedHelpDismissed, setDeniedHelpDismissed] = useState(false)

  if (state.permission === 'granted') {
    return (
      <div className="location-controls">
        {state.searchingForSignal && (
          <p role="status">{t('location.searching')}</p>
        )}
        <button
          type="button"
          onClick={onCenter}
          disabled={state.lastKnownPosition === null}
        >
          {t('location.center')}
        </button>
      </div>
    )
  }

  return (
    <div className="location-controls">
      {state.permission === 'denied' && !deniedHelpDismissed && (
        <div className="location-help" role="alert">
          <strong>{t('location.denied.title')}</strong>
          <p>{t('location.denied.howTo')}</p>
          <button type="button" onClick={() => setDeniedHelpDismissed(true)}>
            {t('nav.close')}
          </button>
        </div>
      )}
      {state.permission === 'not-requested' && (
        <p className="location-help">{t('location.why')}</p>
      )}
      <button
        type="button"
        onClick={() => {
          setDeniedHelpDismissed(false)
          geolocation.startTracking()
        }}
      >
        {t('location.show')}
      </button>
    </div>
  )
}
