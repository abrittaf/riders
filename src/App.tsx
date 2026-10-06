import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { InstallPrompt } from './app-shell/install/InstallPrompt.tsx'
import type { InstallPlatform } from './app-shell/install/install-platform.ts'
import { OptionsPanel } from './app-shell/OptionsPanel.tsx'
import type { Connectivity } from './connectivity/connectivity.ts'
import { ConnectivityIndicator } from './connectivity/ConnectivityIndicator.tsx'
import {
  OnlineContext,
  useConnectivity,
} from './connectivity/online-context.ts'
import type { LanguagePreference } from './i18n/language-preference.ts'
import type { RiderAccountService } from './backend/index.ts'
import type { MapPlatform, MapViewHandle } from './map-platform/index.ts'
import { MapScreen } from './map-view/MapScreen.tsx'
import { OfflineRegionsPanel } from './offline-maps/OfflineRegionsPanel.tsx'
import { StorageWarning } from './offline-maps/StorageWarning.tsx'
import { ProvisionalSignIn } from './rider-account/ProvisionalSignIn.tsx'
import { useOfflineRegions } from './offline-maps/use-offline-regions.ts'

export interface AppDependencies {
  languagePreference: LanguagePreference
  connectivity: Connectivity
  installPlatform: InstallPlatform
  mapPlatform: MapPlatform
  riderAccount: RiderAccountService
}

type OpenPanel = 'none' | 'options' | 'offline-regions'

export function App({ dependencies }: { dependencies: AppDependencies }) {
  const { t, i18n } = useTranslation()
  const [openPanel, setOpenPanel] = useState<OpenPanel>('none')
  const isOnline = useConnectivity(dependencies.connectivity)
  const mapRef = useRef<MapViewHandle>(null)
  const { mapPlatform } = dependencies
  const offlineRegions = useOfflineRegions(mapPlatform.offlineRegions)

  useEffect(() => {
    document.documentElement.lang = i18n.language
  }, [i18n.language])

  return (
    <OnlineContext value={isOnline}>
      <div className="app">
        <header className="app-bar">
          <h1>{t('app.name')}</h1>
          <ConnectivityIndicator />
          <nav>
            <button
              type="button"
              onClick={() => setOpenPanel('offline-regions')}
            >
              {t('nav.offlineRegions')}
            </button>
            <button type="button" onClick={() => setOpenPanel('options')}>
              {t('nav.options')}
            </button>
          </nav>
        </header>
        <ProvisionalSignIn riderAccount={dependencies.riderAccount} />
        <InstallPrompt platform={dependencies.installPlatform} />
        <StorageWarning
          snapshot={offlineRegions}
          onManageRegions={() => setOpenPanel('offline-regions')}
        />
        <main className="app-content">
          <MapScreen
            mapPlatform={mapPlatform}
            mapRef={mapRef}
            offlineRegions={offlineRegions.regions}
          />
        </main>
        {openPanel === 'options' && (
          <OptionsPanel
            languagePreference={dependencies.languagePreference}
            onClose={() => setOpenPanel('none')}
          />
        )}
        {openPanel === 'offline-regions' && (
          <OfflineRegionsPanel
            store={mapPlatform.offlineRegions}
            snapshot={offlineRegions}
            getMap={() => mapRef.current}
            onClose={() => setOpenPanel('none')}
          />
        )}
      </div>
    </OnlineContext>
  )
}
