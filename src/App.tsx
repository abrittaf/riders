import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import type { RiderAccountService, RoadmapService } from './backend/index.ts'
import type {
  GeoPosition,
  MapMarker,
  MapPlatform,
  MapViewHandle,
  Place,
} from './map-platform/index.ts'
import { MapScreen } from './map-view/MapScreen.tsx'
import { OfflineRegionsPanel } from './offline-maps/OfflineRegionsPanel.tsx'
import { StorageWarning } from './offline-maps/StorageWarning.tsx'
import { AccountButton } from './rider-account/AccountButton.tsx'
import { AccountPanel } from './rider-account/AccountPanel.tsx'
import type { ProfileDraftStore } from './rider-account/profile-draft-store.ts'
import { ProfileSetupScreen } from './rider-account/ProfileSetupScreen.tsx'
import { SignInFailedNotice } from './rider-account/SignInFailedNotice.tsx'
import { useRiderSession } from './rider-account/use-rider-session.ts'
import { useOfflineRegions } from './offline-maps/use-offline-regions.ts'
import {
  EMPTY_MAP_DISPLAY,
  type RoadmapMapDisplay,
} from './roadmap-planning/roadmap-map-display.ts'
import { RoadmapDetail } from './roadmap-planning/RoadmapDetail.tsx'
import { RoadmapEditor } from './roadmap-planning/RoadmapEditor.tsx'
import type { Roadmap } from './roadmap-planning/roadmap.ts'
import { RoadmapsPanel } from './roadmap-planning/RoadmapsPanel.tsx'
import { useRoadmaps } from './roadmap-planning/use-roadmaps.ts'

export interface AppDependencies {
  languagePreference: LanguagePreference
  connectivity: Connectivity
  installPlatform: InstallPlatform
  mapPlatform: MapPlatform
  riderAccount: RiderAccountService
  roadmaps: RoadmapService
  profileDrafts: ProfileDraftStore
}

type OpenPanel =
  | 'none'
  | 'options'
  | 'offline-regions'
  | 'account'
  | 'roadmaps'
  | 'roadmap-detail'
  | 'roadmap-editor'

function highlightMarkers(places: readonly Place[]): MapMarker[] {
  return places.map((place, index) => ({
    id: `highlight-${index}`,
    position: place.position,
    kind: 'highlighted-place',
  }))
}

export function App({ dependencies }: { dependencies: AppDependencies }) {
  const { t, i18n } = useTranslation()
  const [openPanel, setOpenPanel] = useState<OpenPanel>('none')
  const isOnline = useConnectivity(dependencies.connectivity)
  const mapRef = useRef<MapViewHandle>(null)
  const { mapPlatform, riderAccount } = dependencies
  const session = useRiderSession(riderAccount)
  const offlineRegions = useOfflineRegions(mapPlatform.offlineRegions)
  const [highlighted, setHighlighted] = useState<MapMarker[]>([])
  const [roadmapDisplay, setRoadmapDisplay] =
    useState<RoadmapMapDisplay>(EMPTY_MAP_DISPLAY)
  const [longPressedPosition, setLongPressedPosition] =
    useState<GeoPosition | null>(null)
  const [pickingPosition, setPickingPosition] = useState(false)
  const roadmaps = useRoadmaps(
    dependencies.roadmaps,
    session.status === 'signed-in' ? session.rider.id : null,
  )
  // El Roadmap abierto (detalle) y el que se edita (`null` al crear uno nuevo).
  const [selectedRoadmapId, setSelectedRoadmapId] = useState<string | null>(
    null,
  )
  const [editingRoadmap, setEditingRoadmap] = useState<Roadmap | null>(null)
  const selectedRoadmap =
    roadmaps?.find((roadmap) => roadmap.id === selectedRoadmapId) ?? null
  const roadmapAttributions = useMemo(
    () => [
      ...mapPlatform.routeProvider.attributions,
      ...mapPlatform.placeSearch.attributions,
    ],
    [mapPlatform],
  )

  function openRoadmap(id: string) {
    setSelectedRoadmapId(id)
    setOpenPanel('roadmap-detail')
  }
  const highlightPlaces = useCallback(
    (places: Place[]) => setHighlighted(highlightMarkers(places)),
    [],
  )
  const markers = useMemo(
    () => [...roadmapDisplay.markers, ...highlighted],
    [roadmapDisplay.markers, highlighted],
  )
  const getMap = useCallback(() => mapRef.current, [])
  const hasProfile = session.status === 'signed-in' && session.profile !== null

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
            {hasProfile && (
              <button type="button" onClick={() => setOpenPanel('roadmaps')}>
                {t('nav.roadmaps')}
              </button>
            )}
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
            markers={markers}
            route={roadmapDisplay.route}
            crosshair={pickingPosition}
            onLongPress={pickingPosition ? setLongPressedPosition : undefined}
          />
        </main>
        {openPanel === 'roadmaps' && hasProfile && (
          <RoadmapsPanel
            roadmaps={roadmaps}
            onOpen={(roadmap) => openRoadmap(roadmap.id)}
            onCreate={() => {
              setEditingRoadmap(null)
              setOpenPanel('roadmap-editor')
            }}
            onClose={() => setOpenPanel('none')}
          />
        )}
        {openPanel === 'roadmap-detail' && hasProfile && selectedRoadmap && (
          <RoadmapDetail
            roadmap={selectedRoadmap}
            attributions={roadmapAttributions}
            getMap={getMap}
            onMapDisplayChange={setRoadmapDisplay}
            onEdit={() => {
              setEditingRoadmap(selectedRoadmap)
              setOpenPanel('roadmap-editor')
            }}
            onDuplicate={async () => {
              const copyId = await dependencies.roadmaps.duplicate(
                selectedRoadmap.id,
                t('roadmaps.detail.copySuffix'),
              )
              openRoadmap(copyId)
            }}
            onDelete={async () => {
              await dependencies.roadmaps.delete(selectedRoadmap.id)
              setSelectedRoadmapId(null)
              setOpenPanel('roadmaps')
            }}
            onClose={() => setOpenPanel('roadmaps')}
          />
        )}
        {openPanel === 'roadmap-editor' && hasProfile && (
          <RoadmapEditor
            dependencies={{
              roadmaps: dependencies.roadmaps,
              routeProvider: mapPlatform.routeProvider,
              placeSearch: mapPlatform.placeSearch,
              geolocation: mapPlatform.geolocation,
            }}
            roadmap={editingRoadmap}
            getMap={getMap}
            positionFromMap={longPressedPosition}
            onPositionFromMapHandled={() => setLongPressedPosition(null)}
            onPickingChange={setPickingPosition}
            onHighlight={highlightPlaces}
            onMapDisplayChange={setRoadmapDisplay}
            onSaved={(id) => openRoadmap(id)}
            onClose={() => {
              setLongPressedPosition(null)
              setOpenPanel(editingRoadmap ? 'roadmap-detail' : 'roadmaps')
            }}
          />
        )}
        {openPanel === 'options' && (
          <OptionsPanel
            languagePreference={dependencies.languagePreference}
            onClose={() => setOpenPanel('none')}
          />
        )}
        {openPanel === 'account' &&
          session.status === 'signed-in' &&
          session.profile !== null && (
            <AccountPanel
              rider={session.rider}
              profile={session.profile}
              vehicle={session.vehicle}
              pendingSync={session.pendingSync}
              riderAccount={riderAccount}
              onSignOut={() => {
                setOpenPanel('none')
                void riderAccount.signOut()
              }}
              onClose={() => setOpenPanel('none')}
            />
          )}
        {session.status === 'signed-in' && session.profile === null && (
          <ProfileSetupScreen
            rider={session.rider}
            riderAccount={riderAccount}
            drafts={dependencies.profileDrafts}
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
