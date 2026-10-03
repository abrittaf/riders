import type { GeoPosition } from './geo.ts'

export type LocationPermission = 'not-requested' | 'granted' | 'denied'

export interface GeolocationState {
  permission: LocationPermission
  lastKnownPosition: GeoPosition | null
  /** El celular no logra determinar la posición en este momento. */
  searchingForSignal: boolean
}

/** Posición actual del Rider y estado del permiso de ubicación. */
export interface Geolocation {
  getState(): GeolocationState
  subscribe(listener: () => void): () => void
  /** Empieza a seguir la posición; si el permiso no fue pedido, el celular lo pide en este momento. */
  startTracking(): void
  stopTracking(): void
}
