import { describe, expect, it, vi } from 'vitest'
import {
  BrowserGeolocation,
  type BrowserLocationApi,
} from './browser-geolocation.ts'

const PERMISSION_DENIED = 1
const POSITION_UNAVAILABLE = 2
const TIMEOUT = 3

/** Simula el GPS del celular: la prueba decide cuándo llega una posición o un error. */
function simulatedLocationApi(permission: PermissionState | null = 'prompt') {
  let onPosition: PositionCallback = () => {}
  let onError: PositionErrorCallback = () => {}
  const clearWatch = vi.fn()
  const watchPosition = vi.fn(
    (success: PositionCallback, error?: PositionErrorCallback | null) => {
      onPosition = success
      onError = error ?? (() => {})
      return 7
    },
  )
  const api: BrowserLocationApi = {
    geolocation: { watchPosition, clearWatch },
    queryPermission: () => Promise.resolve(permission),
  }
  return {
    api,
    watchPosition,
    clearWatch,
    moveTo(latitude: number, longitude: number) {
      onPosition({ coords: { latitude, longitude } } as GeolocationPosition)
    },
    fail(code: number) {
      onError({
        code,
        PERMISSION_DENIED,
        POSITION_UNAVAILABLE,
        TIMEOUT,
      } as GeolocationPositionError)
    },
  }
}

describe('posición del Rider', () => {
  it('no pide el permiso hasta que el Rider lo solicita', async () => {
    const gps = simulatedLocationApi('prompt')
    const geolocation = new BrowserGeolocation(gps.api)

    await geolocation.restorePermission()

    expect(gps.watchPosition).not.toHaveBeenCalled()
    expect(geolocation.getState().permission).toBe('not-requested')
  })

  it('con el permiso concedido informa la posición y la actualiza mientras el Rider se mueve', () => {
    const gps = simulatedLocationApi()
    const geolocation = new BrowserGeolocation(gps.api)
    const onChange = vi.fn()
    geolocation.subscribe(onChange)

    geolocation.startTracking()
    gps.moveTo(-34.6, -58.38)

    expect(geolocation.getState()).toEqual({
      permission: 'granted',
      lastKnownPosition: { latitude: -34.6, longitude: -58.38 },
      searchingForSignal: false,
    })

    gps.moveTo(-34.61, -58.39)

    expect(geolocation.getState().lastKnownPosition).toEqual({
      latitude: -34.61,
      longitude: -58.39,
    })
    expect(onChange).toHaveBeenCalled()
  })

  it('si el permiso ya estaba concedido, sigue la posición sin volver a preguntar', async () => {
    const gps = simulatedLocationApi('granted')
    const geolocation = new BrowserGeolocation(gps.api)

    await geolocation.restorePermission()

    expect(gps.watchPosition).toHaveBeenCalledOnce()
    expect(geolocation.getState().permission).toBe('granted')
  })

  it('con el permiso denegado no informa ninguna posición y deja de pedirla', () => {
    const gps = simulatedLocationApi()
    const geolocation = new BrowserGeolocation(gps.api)

    geolocation.startTracking()
    gps.fail(PERMISSION_DENIED)

    expect(geolocation.getState()).toEqual({
      permission: 'denied',
      lastKnownPosition: null,
      searchingForSignal: false,
    })
    expect(gps.clearWatch).toHaveBeenCalledWith(7)
  })

  it('si el permiso ya estaba denegado, lo refleja al arrancar', async () => {
    const geolocation = new BrowserGeolocation(
      simulatedLocationApi('denied').api,
    )

    await geolocation.restorePermission()

    expect(geolocation.getState().permission).toBe('denied')
  })

  it.each([
    ['el GPS no puede determinar la posición', POSITION_UNAVAILABLE],
    ['el GPS tarda demasiado en responder', TIMEOUT],
  ])(
    'cuando %s conserva la última posición conocida e indica que busca señal',
    (_, errorCode) => {
      const gps = simulatedLocationApi()
      const geolocation = new BrowserGeolocation(gps.api)
      geolocation.startTracking()
      gps.moveTo(-31.42, -64.18)

      gps.fail(errorCode)

      expect(geolocation.getState()).toEqual({
        permission: 'granted',
        lastKnownPosition: { latitude: -31.42, longitude: -64.18 },
        searchingForSignal: true,
      })
    },
  )

  it('deja de buscar señal cuando el GPS vuelve a informar la posición', () => {
    const gps = simulatedLocationApi()
    const geolocation = new BrowserGeolocation(gps.api)
    geolocation.startTracking()
    gps.moveTo(-31.42, -64.18)
    gps.fail(TIMEOUT)

    gps.moveTo(-31.43, -64.19)

    expect(geolocation.getState().searchingForSignal).toBe(false)
  })

  it('en un celular sin geolocalización se comporta como permiso denegado', () => {
    const geolocation = new BrowserGeolocation({
      geolocation: null,
      queryPermission: () => Promise.resolve(null),
    })

    geolocation.startTracking()

    expect(geolocation.getState().permission).toBe('denied')
  })
})
