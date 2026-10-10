import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { Point } from '../point-lookup/point.ts'
import {
  FakeRiderAccountService,
  sampleProfile,
  sampleRider,
  sampleVehicle,
} from '../test-support/fake-rider-account-service.ts'
import { FakePlaceSearch } from '../test-support/fake-place-search.ts'
import { FakeRoadmapService } from '../test-support/fake-roadmap-service.ts'
import { FakeRouteProvider } from '../test-support/fake-route-provider.ts'
import { renderApp } from '../test-support/render-app.tsx'
import { encodeGeometry, type RoadmapDraft } from './roadmap.ts'

const SALTA = { latitude: -24.7859, longitude: -65.4117 }
const CACHI = { latitude: -25.1197, longitude: -66.1656 }

function point(
  name: string,
  position: typeof SALTA,
  date: string | null = null,
): Point {
  return { name, position, source: 'known-place', type: 'fuel', date }
}

const idaACachi: RoadmapDraft = {
  name: 'Ida a Cachi',
  description: 'Por la Cuesta del Obispo',
  points: [point('Salta', SALTA), point('Cachi', CACHI, '2026-11-20')],
  legs: [
    {
      distanceM: 167273,
      durationS: 18547,
      unpavedM: 15686,
      geometry: encodeGeometry([SALTA, CACHI]),
      surfaces: [{ fromIndex: 0, toIndex: 1, surface: 'paved' }],
    },
  ],
}

function signedInRider() {
  return new FakeRiderAccountService({
    status: 'signed-in',
    rider: sampleRider,
    profile: sampleProfile,
    vehicle: sampleVehicle,
    pendingSync: false,
  })
}

async function openList(roadmaps = new FakeRoadmapService()) {
  const app = renderApp({ riderAccount: signedInRider(), roadmaps })
  await userEvent.click(screen.getByRole('button', { name: 'Roadmaps' }))
  return { ...app, list: screen.getByRole('dialog', { name: 'Roadmaps' }) }
}

describe('lista de Roadmaps', () => {
  it('sin Roadmaps explica qué es un Roadmap y ofrece crear el primero', async () => {
    const { list } = await openList()

    expect(
      within(list).getByRole('heading', {
        name: 'Todavía no tenés ningún Roadmap',
      }),
    ).toBeVisible()
    expect(within(list).getByText(/Un Roadmap es un viaje/)).toBeVisible()
    expect(
      within(list).getByRole('button', { name: 'Nuevo Roadmap' }),
    ).toBeEnabled()
  })

  it('lista cada Roadmap con nombre, distancia, tiempo y cantidad de Points, y al elegirlo lo muestra sobre el mapa encuadrado', async () => {
    const roadmaps = new FakeRoadmapService()
    roadmaps.given('r1', idaACachi)
    const { list, map } = await openList(roadmaps)

    const item = within(list).getByRole('button', { name: /Ida a Cachi/ })
    expect(item).toHaveTextContent('Ida a Cachi167 km · 5h 9min · 2 Points')

    await userEvent.click(item)

    const detail = screen.getByRole('dialog', { name: 'Ida a Cachi' })
    expect(within(detail).getByText('Por la Cuesta del Obispo')).toBeVisible()
    expect(within(detail).getByText(/^Total:/)).toHaveTextContent(
      '167 km · 5h 9min · 15,7 km sin pavimentar',
    )
    expect(within(detail).getByText(/20 nov 2026/)).toBeVisible()
    expect(
      screen.getAllByTestId('marker-point').map((m) => m.textContent),
    ).toEqual(['1', '2'])
    expect(screen.getByTestId('map')).toHaveAttribute('data-route-legs', '1')
    expect(map.handle.fitBounds).toHaveBeenCalledWith({
      west: -66.1656,
      south: -25.1197,
      east: -65.4117,
      north: -24.7859,
    })
  })

  it('sin conexión, crear un Roadmap queda señalado como no disponible', async () => {
    const { list, connectivity } = await openList()

    act(() => connectivity.setOnline(false))

    expect(
      within(list).getByRole('button', { name: 'Nuevo Roadmap' }),
    ).toBeDisabled()
    expect(
      within(list).getByText('Crear un Roadmap requiere conexión'),
    ).toBeVisible()
  })
})

describe('detalle de un Roadmap', () => {
  async function openDetail() {
    const roadmaps = new FakeRoadmapService()
    roadmaps.given('r1', idaACachi)
    const app = await openList(roadmaps)
    await userEvent.click(
      within(app.list).getByRole('button', { name: /Ida a Cachi/ }),
    )
    return {
      ...app,
      detail: screen.getByRole('dialog', { name: 'Ida a Cachi' }),
    }
  }

  it('editar abre el editor con el Roadmap cargado y al guardar vuelve al detalle con el cambio', async () => {
    const { detail, roadmaps } = await openDetail()

    await userEvent.click(
      within(detail).getByRole('button', { name: 'Editar' }),
    )

    const editor = screen.getByRole('dialog', { name: 'Editar Roadmap' })
    expect(within(editor).getByLabelText('Nombre')).toHaveValue('Ida a Cachi')
    await userEvent.clear(within(editor).getByLabelText('Nombre'))
    await userEvent.type(
      within(editor).getByLabelText('Nombre'),
      'Vuelta de Cachi',
    )
    await userEvent.click(
      within(editor).getByRole('button', { name: 'Guardar' }),
    )

    await waitFor(() =>
      expect(roadmaps.stored.get('r1')!.name).toBe('Vuelta de Cachi'),
    )
    expect(
      screen.getByRole('dialog', { name: 'Vuelta de Cachi' }),
    ).toBeVisible()
  })

  it('borrar pide confirmación; al cancelar no borra nada y al confirmar desaparece de la lista', async () => {
    const { detail, roadmaps } = await openDetail()

    await userEvent.click(
      within(detail).getByRole('button', { name: 'Borrar' }),
    )
    const confirmation = screen.getByRole('alertdialog', {
      name: 'Borrar el Roadmap',
    })
    await userEvent.click(
      within(confirmation).getByRole('button', { name: 'Cancelar' }),
    )
    expect(roadmaps.stored.size).toBe(1)

    await userEvent.click(
      within(detail).getByRole('button', { name: 'Borrar' }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Sí, borrar' }))

    await waitFor(() => expect(roadmaps.stored.size).toBe(0))
    const list = screen.getByRole('dialog', { name: 'Roadmaps' })
    expect(
      within(list).queryByRole('button', { name: /Ida a Cachi/ }),
    ).not.toBeInTheDocument()
  })

  it('duplicar crea un Roadmap nuevo e independiente, sin las fechas, y lo abre', async () => {
    const { detail, roadmaps } = await openDetail()

    await userEvent.click(
      within(detail).getByRole('button', { name: 'Duplicar' }),
    )

    const copy = await screen.findByRole('dialog', {
      name: 'Ida a Cachi (copia)',
    })
    expect(within(copy).queryByText('20 nov 2026')).not.toBeInTheDocument()
    expect(within(copy).getByText(/^Total:/)).toHaveTextContent('167 km')
    expect(roadmaps.stored.size).toBe(2)
    expect(roadmaps.stored.get('r1')!.points[1]!.date).toBe('2026-11-20')
  })

  it('sin conexión muestra el Roadmap con su ruta y totales, y editar, duplicar y borrar quedan señalados como no disponibles', async () => {
    const { detail, connectivity } = await openDetail()

    act(() => connectivity.setOnline(false))

    expect(within(detail).getByText(/^Total:/)).toHaveTextContent('167 km')
    expect(screen.getByTestId('map')).toHaveAttribute('data-route-legs', '1')
    for (const name of ['Editar', 'Duplicar', 'Borrar']) {
      expect(within(detail).getByRole('button', { name })).toBeDisabled()
    }
    expect(within(detail).getAllByText('Requiere conexión')).toHaveLength(3)
  })

  it('muestra la atribución del motor de ruteo y del buscador tal como la informan los proveedores, con el detalle de las fuentes', async () => {
    const roadmaps = new FakeRoadmapService()
    roadmaps.given('r1', idaACachi)
    const routeProvider = new FakeRouteProvider()
    routeProvider.attributions.push(
      {
        name: 'Valhalla',
        url: 'https://valhalla.example',
        descriptionKey: 'map.sources.valhalla',
      },
      {
        name: 'OpenStreetMap',
        url: 'https://www.openstreetmap.org/fixthemap',
        descriptionKey: 'map.sources.routeData',
      },
    )
    const placeSearch = new FakePlaceSearch()
    placeSearch.attributions.push({
      name: 'Photon',
      url: 'https://photon.example',
      descriptionKey: 'map.sources.photon',
    })
    renderApp({
      riderAccount: signedInRider(),
      roadmaps,
      routeProvider,
      placeSearch,
    })
    await userEvent.click(screen.getByRole('button', { name: 'Roadmaps' }))
    await userEvent.click(screen.getByRole('button', { name: /Ida a Cachi/ }))

    const attribution = screen.getByRole('button', {
      name: 'Fuentes del ruteo y la búsqueda',
    })
    expect(attribution).toHaveTextContent('© Valhalla · OpenStreetMap · Photon')

    await userEvent.click(attribution)

    const sources = screen.getByRole('dialog', {
      name: 'Fuentes del ruteo y de la búsqueda de lugares',
    })
    expect(
      within(sources).getByRole('link', { name: 'OpenStreetMap' }),
    ).toHaveAttribute('href', 'https://www.openstreetmap.org/fixthemap')
    expect(
      within(sources).getByText(/Photon, geocodificador de código abierto/),
    ).toBeVisible()
  })
})
