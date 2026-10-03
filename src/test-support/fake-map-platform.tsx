import { useEffect, useImperativeHandle } from 'react'
import { vi } from 'vitest'
import type {
  Geolocation,
  GeolocationState,
  MapAttribution,
  MapViewHandle,
  MapViewProps,
} from '../map-platform/index.ts'

export class FakeGeolocation implements Geolocation {
  private state: GeolocationState = {
    permission: 'not-requested',
    lastKnownPosition: null,
    searchingForSignal: false,
  }
  private readonly listeners = new Set<() => void>()
  readonly startTracking = vi.fn()
  readonly stopTracking = vi.fn()

  getState(): GeolocationState {
    return this.state
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  report(changes: Partial<GeolocationState>) {
    this.state = { ...this.state, ...changes }
    this.listeners.forEach((listener) => listener())
  }
}

/** Mapa sin renderizador: registra lo que la app le pide dibujar y expone las acciones como espías. */
export function createFakeMapView() {
  const handle = {
    centerOn: vi.fn(),
    getVisibleBounds: vi.fn(() => ({
      west: -59,
      south: -35,
      east: -58,
      north: -34,
    })),
    zoomIn: vi.fn(),
    retryUnavailableTiles: vi.fn(),
  } satisfies MapViewHandle
  let lastProps: MapViewProps | null = null

  function FakeMapView({ ref, ...props }: MapViewProps) {
    const { ownPosition } = props
    useEffect(() => {
      lastProps = props
    })
    useImperativeHandle(ref, () => handle)
    return (
      <div
        data-testid="map"
        data-own-position={
          ownPosition
            ? `${ownPosition.position.latitude},${ownPosition.position.longitude}`
            : undefined
        }
        data-own-position-is-last-known={ownPosition?.isLastKnown}
      />
    )
  }

  return {
    MapView: FakeMapView,
    handle,
    reportUnavailableArea(hasUnavailableArea: boolean) {
      lastProps?.onUnavailableAreaChange?.(hasUnavailableArea)
    },
  }
}

export const fakeAttributions: MapAttribution[] = [
  {
    name: 'OpenStreetMap',
    url: 'https://www.openstreetmap.org/copyright',
    descriptionKey: 'map.sources.openStreetMap',
  },
]
