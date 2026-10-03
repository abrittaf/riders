import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { RefObject } from 'react'
import { describe, expect, it } from 'vitest'
import { OnlineContext } from '../connectivity/online-context.ts'
import type { MapViewHandle, OfflineRegion } from '../map-platform/index.ts'
import {
  createFakeMapView,
  fakeAttributions,
  FakeGeolocation,
} from '../test-support/fake-map-platform.tsx'
import { renderInSpanish } from '../test-support/render-with-i18n.tsx'
import { MapScreen } from './MapScreen.tsx'

function renderMapScreen(
  options: { online?: boolean; offlineRegions?: OfflineRegion[] } = {},
) {
  const map = createFakeMapView()
  const geolocation = new FakeGeolocation()
  const mapRef: RefObject<MapViewHandle | null> = { current: null }
  renderInSpanish(
    <OnlineContext value={options.online ?? true}>
      <MapScreen
        mapPlatform={{
          MapView: map.MapView,
          geolocation,
          attributions: fakeAttributions,
        }}
        mapRef={mapRef}
        offlineRegions={options.offlineRegions ?? []}
      />
    </OnlineContext>,
  )
  return { map, geolocation }
}

const CORDOBA = { latitude: -31.42, longitude: -64.18 }

describe('posición actual del Rider sobre el mapa', () => {
  it('antes de pedir el permiso explica para qué se usa la ubicación y lo pide solo si el Rider quiere', async () => {
    const { geolocation } = renderMapScreen()

    expect(
      screen.getByText(
        'Riders usa tu ubicación solo para mostrarte en el mapa.',
      ),
    ).toBeVisible()
    expect(geolocation.startTracking).not.toHaveBeenCalled()

    await userEvent.click(
      screen.getByRole('button', { name: 'Mostrar mi posición' }),
    )

    expect(geolocation.startTracking).toHaveBeenCalledOnce()
  })

  it('con el permiso concedido marca la posición y la actualiza mientras el Rider se mueve', () => {
    const { geolocation } = renderMapScreen()

    act(() =>
      geolocation.report({ permission: 'granted', lastKnownPosition: CORDOBA }),
    )
    expect(screen.getByTestId('map')).toHaveAttribute(
      'data-own-position',
      '-31.42,-64.18',
    )

    act(() =>
      geolocation.report({
        lastKnownPosition: { latitude: -31.5, longitude: -64.2 },
      }),
    )
    expect(screen.getByTestId('map')).toHaveAttribute(
      'data-own-position',
      '-31.5,-64.2',
    )
  })

  it('al tocar «centrar» lleva el mapa a la posición del Rider', async () => {
    const { geolocation, map } = renderMapScreen()
    act(() =>
      geolocation.report({ permission: 'granted', lastKnownPosition: CORDOBA }),
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Centrar en mi posición' }),
    )

    expect(map.handle.centerOn).toHaveBeenCalledWith(CORDOBA)
  })

  it('con el permiso denegado no marca la posición y explica cómo habilitarlo', () => {
    const { geolocation } = renderMapScreen()

    act(() => geolocation.report({ permission: 'denied' }))

    expect(screen.getByTestId('map')).not.toHaveAttribute('data-own-position')
    expect(screen.getByRole('alert')).toHaveTextContent(
      'abrí la configuración del celular',
    )
    expect(
      screen.getByRole('button', { name: 'Fuentes del mapa' }),
    ).toBeVisible()
  })

  it('sin señal de GPS muestra la última posición conocida e indica que está buscando señal', () => {
    const { geolocation } = renderMapScreen()

    act(() =>
      geolocation.report({
        permission: 'granted',
        lastKnownPosition: CORDOBA,
        searchingForSignal: true,
      }),
    )

    expect(screen.getByTestId('map')).toHaveAttribute(
      'data-own-position',
      '-31.42,-64.18',
    )
    expect(screen.getByTestId('map')).toHaveAttribute(
      'data-own-position-is-last-known',
      'true',
    )
    expect(screen.getByRole('status')).toHaveTextContent(
      'Buscando señal de GPS…',
    )
  })

  it('sin señal y sin posición previa indica que busca señal y no ofrece centrar', () => {
    const { geolocation } = renderMapScreen()

    act(() =>
      geolocation.report({ permission: 'granted', searchingForSignal: true }),
    )

    expect(screen.getByRole('status')).toHaveTextContent(
      'Buscando señal de GPS…',
    )
    expect(
      screen.getByRole('button', { name: 'Centrar en mi posición' }),
    ).toBeDisabled()
  })
})

describe('zonas del mapa no disponibles sin conexión', () => {
  const visibleRegion: OfflineRegion = {
    id: 'cuesta',
    name: 'Cuesta del Obispo',
    bounds: { west: -58.5, south: -34.5, east: -58.2, north: -34.2 },
    status: 'paused',
    pauseReason: 'connectivity',
    totalTileCount: 100,
    downloadedTileCount: 40,
    sizeInBytes: 1000,
    downloadedAt: new Date('2026-10-01'),
  }

  it('avisa cuando la zona visible no fue descargada', () => {
    const { map } = renderMapScreen({ online: false })

    act(() => map.reportUnavailableArea(true))

    expect(screen.getByRole('status')).toHaveTextContent(
      'Esta zona del mapa no está disponible sin conexión.',
    )
  })

  it('indica que la zona está incompleta cuando su descarga quedó en pausa', () => {
    const { map } = renderMapScreen({
      online: false,
      offlineRegions: [visibleRegion],
    })

    act(() => map.reportUnavailableArea(true))

    expect(screen.getByRole('status')).toHaveTextContent(
      'La zona «Cuesta del Obispo» está incompleta',
    )
  })

  it('no avisa nada mientras toda la zona visible se puede dibujar', () => {
    renderMapScreen({ online: false })

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
