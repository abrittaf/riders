import { useSyncExternalStore } from 'react'
import type { Geolocation, GeolocationState } from '../map-platform/index.ts'

export function useGeolocation(geolocation: Geolocation): GeolocationState {
  return useSyncExternalStore(
    (listener) => geolocation.subscribe(listener),
    () => geolocation.getState(),
  )
}
