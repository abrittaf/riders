import { App } from '../App.tsx'
import { LocalStorageLanguagePreference } from '../i18n/language-preference.ts'
import type { OfflineRegion } from '../map-platform/index.ts'
import {
  createFakeMapView,
  fakeAttributions,
  FakeGeolocation,
} from './fake-map-platform.tsx'
import { FakeOfflineRegionStore } from './fake-offline-region-store.ts'
import { FakeRiderAccountService } from './fake-rider-account-service.ts'
import { FakeConnectivity, notInstallablePlatform } from './fakes.ts'
import { renderInSpanish } from './render-with-i18n.tsx'

/** La app completa, con el mapa, el almacenamiento y la conectividad simulados. */
export function renderApp(
  options: { regions?: OfflineRegion[]; storageRunningLow?: boolean } = {},
) {
  const connectivity = new FakeConnectivity()
  const map = createFakeMapView()
  const offlineRegions = new FakeOfflineRegionStore(options.regions)
  offlineRegions.isRunningLow = options.storageRunningLow ?? false
  renderInSpanish(
    <App
      dependencies={{
        languagePreference: new LocalStorageLanguagePreference(
          window.localStorage,
        ),
        connectivity,
        installPlatform: notInstallablePlatform,
        riderAccount: new FakeRiderAccountService(),
        mapPlatform: {
          MapView: map.MapView,
          tileSource: { getTile: () => Promise.reject(new Error('sin uso')) },
          offlineRegions,
          geolocation: new FakeGeolocation(),
          attributions: fakeAttributions,
        },
      }}
    />,
  )
  return { connectivity, map, offlineRegions }
}
