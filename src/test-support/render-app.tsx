import { App } from '../App.tsx'
import { LocalStorageLanguagePreference } from '../i18n/language-preference.ts'
import { LocalStorageProfileDraftStore } from '../rider-account/profile-draft-store.ts'
import type { OfflineRegion } from '../map-platform/index.ts'
import {
  createFakeMapView,
  fakeAttributions,
  FakeGeolocation,
} from './fake-map-platform.tsx'
import { FakeOfflineRegionStore } from './fake-offline-region-store.ts'
import { FakePlaceSearch } from './fake-place-search.ts'
import { FakeRiderAccountService } from './fake-rider-account-service.ts'
import { FakeRoadmapService } from './fake-roadmap-service.ts'
import { FakeRouteProvider } from './fake-route-provider.ts'
import { FakeConnectivity, notInstallablePlatform } from './fakes.ts'
import { renderInSpanish } from './render-with-i18n.tsx'

/** La app completa, con el mapa, el almacenamiento y la conectividad simulados. */
export function renderApp(
  options: {
    regions?: OfflineRegion[]
    storageRunningLow?: boolean
    riderAccount?: FakeRiderAccountService
    placeSearch?: FakePlaceSearch
    routeProvider?: FakeRouteProvider
    roadmaps?: FakeRoadmapService
  } = {},
) {
  const connectivity = new FakeConnectivity()
  const riderAccount = options.riderAccount ?? new FakeRiderAccountService()
  const map = createFakeMapView()
  const placeSearch = options.placeSearch ?? new FakePlaceSearch()
  const routeProvider = options.routeProvider ?? new FakeRouteProvider()
  const roadmaps = options.roadmaps ?? new FakeRoadmapService()
  const geolocation = new FakeGeolocation()
  const offlineRegions = new FakeOfflineRegionStore(options.regions)
  offlineRegions.isRunningLow = options.storageRunningLow ?? false
  const rendered = renderInSpanish(
    <App
      dependencies={{
        languagePreference: new LocalStorageLanguagePreference(
          window.localStorage,
        ),
        connectivity,
        installPlatform: notInstallablePlatform,
        riderAccount,
        roadmaps,
        profileDrafts: new LocalStorageProfileDraftStore(window.localStorage),
        mapPlatform: {
          MapView: map.MapView,
          tileSource: { getTile: () => Promise.reject(new Error('sin uso')) },
          offlineRegions,
          geolocation,
          routeProvider,
          placeSearch,
          attributions: fakeAttributions,
        },
      }}
    />,
  )
  return {
    connectivity,
    map,
    geolocation,
    placeSearch,
    routeProvider,
    roadmaps,
    offlineRegions,
    riderAccount,
    unmount: rendered.unmount,
  }
}
