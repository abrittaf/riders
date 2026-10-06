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
import { AccountButton } from './rider-account/AccountButton.tsx'
import { AccountPanel } from './rider-account/AccountPanel.tsx'
import { ProfileIncompleteGate } from './rider-account/ProfileIncompleteGate.tsx'
import { SignInFailedNotice } from './rider-account/SignInFailedNotice.tsx'
import { useRiderSession } from './rider-account/use-rider-session.ts'
import { useOfflineRegions } from './offline-maps/use-offline-regions.ts'

export interface AppDependencies {
  languagePreference: LanguagePreference
  connectivity: Connectivity
  installPlatform: InstallPlatform
  mapPlatform: MapPlatform
  riderAccount: RiderAccountService
}

type OpenPanel = 'none' | 'options' | 'offline-regions' | 'account'

export function App({ dependencies }: { dependencies: AppDependencies }) {
  const { t, i18n } = useTranslation()
  const [openPanel, setOpenPanel] = useState<OpenPanel>('none')
  const isOnline = useConnectivity(dependencies.connectivity)
  const mapRef = useRef<MapViewHandle>(null)
  const { mapPlatform, riderAccount } = dependencies
  const session = useRiderSession(riderAccount)
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
            <AccountButton
              session={session}
              onSignIn={() => void riderAccount.signIn()}
              onOpenAccount={() => setOpenPanel('account')}
            />
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
        {session.status === 'signed-out' && session.signInFailed && (
          <SignInFailedNotice
            onRetry={() => void riderAccount.signIn()}
            onDismiss={() => riderAccount.dismissSignInFailure()}
          />
        )}
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
        {openPanel === 'account' && session.status === 'signed-in' && (
          <AccountPanel
            rider={session.rider}
            profile={session.profile}
            onSignOut={() => {
              setOpenPanel('none')
              void riderAccount.signOut()
            }}
            onClose={() => setOpenPanel('none')}
          />
        )}
        {session.status === 'signed-in' && session.profile === null && (
          <ProfileIncompleteGate
            onSignOut={() => void riderAccount.signOut()}
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
