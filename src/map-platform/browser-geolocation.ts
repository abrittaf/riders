import type { Geolocation, GeolocationState } from './geolocation.ts'

const WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 5_000,
  timeout: 15_000,
}

/** La parte de `navigator.geolocation` y `navigator.permissions` que la app usa. */
export interface BrowserLocationApi {
  geolocation: Pick<
    globalThis.Geolocation,
    'watchPosition' | 'clearWatch'
  > | null
  queryPermission(): Promise<PermissionState | null>
}

export function browserLocationApi(): BrowserLocationApi {
  return {
    geolocation: 'geolocation' in navigator ? navigator.geolocation : null,
    async queryPermission() {
      try {
        const status = await navigator.permissions.query({
          name: 'geolocation',
        })
        return status.state
      } catch {
        return null
      }
    },
  }
}

/** Seguimiento de la posición con la API del navegador, mientras la app está en primer plano. */
export class BrowserGeolocation implements Geolocation {
  private readonly api: BrowserLocationApi
  private state: GeolocationState = {
    permission: 'not-requested',
    lastKnownPosition: null,
    searchingForSignal: false,
  }
  private watchId: number | null = null
  private readonly listeners = new Set<() => void>()

  constructor(api: BrowserLocationApi) {
    this.api = api
  }

  /** Si el Rider ya había concedido o denegado el permiso, refleja ese estado sin volver a preguntarle. */
  async restorePermission(): Promise<void> {
    const permission = await this.api.queryPermission()
    if (permission === 'granted') {
      this.update({ permission: 'granted' })
      this.startTracking()
    }
    if (permission === 'denied') this.update({ permission: 'denied' })
  }

  getState(): GeolocationState {
    return this.state
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  startTracking(): void {
    if (this.watchId !== null) return
    if (!this.api.geolocation) {
      this.update({ permission: 'denied' })
      return
    }
    this.update({ searchingForSignal: true })
    this.watchId = this.api.geolocation.watchPosition(
      (position) =>
        this.update({
          permission: 'granted',
          searchingForSignal: false,
          lastKnownPosition: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
        }),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          this.stopTracking()
          this.update({ permission: 'denied', searchingForSignal: false })
        } else {
          // El celular solo informa falta de señal cuando el permiso está concedido.
          this.update({ permission: 'granted', searchingForSignal: true })
        }
      },
      WATCH_OPTIONS,
    )
  }

  stopTracking(): void {
    if (this.watchId === null) return
    this.api.geolocation?.clearWatch(this.watchId)
    this.watchId = null
  }

  private update(changes: Partial<GeolocationState>) {
    this.state = { ...this.state, ...changes }
    this.listeners.forEach((listener) => listener())
  }
}
