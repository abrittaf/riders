import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { FakePlaceSearch, place } from '../test-support/fake-place-search.ts'
import {
  FakeRiderAccountService,
  sampleProfile,
  sampleRider,
  sampleVehicle,
} from '../test-support/fake-rider-account-service.ts'
import { FakeRouteProvider } from '../test-support/fake-route-provider.ts'
import { renderApp } from '../test-support/render-app.tsx'

const SALTA = { latitude: -24.7859, longitude: -65.4117 }
const CACHI = { latitude: -25.1197, longitude: -66.1656 }
const CAFAYATE = { latitude: -26.0731, longitude: -65.9767 }

function signedInRider() {
  return new FakeRiderAccountService({
    status: 'signed-in',
    rider: sampleRider,
    profile: sampleProfile,
    vehicle: sampleVehicle,
    pendingSync: false,
  })
}

async function openEditor(options: { routeProvider?: FakeRouteProvider } = {}) {
  const placeSearch = new FakePlaceSearch()
  const app = renderApp({
    riderAccount: signedInRider(),
    placeSearch,
    ...options,
  })
  await userEvent.click(screen.getByRole('button', { name: 'Roadmaps' }))
  await userEvent.click(screen.getByRole('button', { name: 'Nuevo Roadmap' }))
  return {
    ...app,
    placeSearch,
    editor: screen.getByRole('dialog', { name: 'Nuevo Roadmap' }),
  }
}

/** Agrega un Point buscándolo por nombre, con el resultado que se le indica. */
async function addPointByName(
  placeSearch: FakePlaceSearch,
  name: string,
  position: { latitude: number; longitude: number },
  options: { insertButton?: string } = {},
) {
  placeSearch.results = [place({ name, position })]
  await userEvent.click(
    screen.getByRole('button', {
      name: options.insertButton ?? 'Agregar Point',
    }),
  )
  await userEvent.type(screen.getByLabelText('Nombre del lugar'), name)
  await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))
  await userEvent.click(await screen.findByRole('button', { name: 'Elegir' }))
}

/** Los resúmenes de los tramos calculados, en orden. */
function legSummaries() {
  return [...document.querySelectorAll('.leg-summary')].map(
    (summary) => summary.textContent,
  )
}

function pointNames() {
  return within(screen.getByRole('list', { name: 'Points del Roadmap' }))
    .getAllByRole('listitem')
    .map((item) => within(item).getByRole('strong').textContent)
}

describe('editor de Roadmap: validaciones', () => {
  it('no guarda con el nombre vacío ni con un solo Point, y lo indica junto a cada campo', async () => {
    const { placeSearch, roadmaps } = await openEditor()
    await addPointByName(placeSearch, 'Salta', SALTA)

    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getByLabelText('Nombre')).toHaveAccessibleDescription(
      'Poné un nombre al Roadmap.',
    )
    expect(
      screen.getByText(
        'Hacen falta al menos dos Points: la salida y la llegada.',
      ),
    ).toBeVisible()
    expect(roadmaps.stored.size).toBe(0)
  })

  it('rechaza un nombre de más de 60 caracteres', async () => {
    await openEditor()

    await userEvent.type(screen.getByLabelText('Nombre'), 'x'.repeat(61))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getByLabelText('Nombre')).toHaveAccessibleDescription(
      'El nombre no puede superar los 60 caracteres.',
    )
  })

  it('con nombre y dos Points calcula la ruta, muestra los kilómetros aproximados y guarda', async () => {
    const { placeSearch, roadmaps, routeProvider } = await openEditor()
    await userEvent.type(screen.getByLabelText('Nombre'), 'Ida a Cachi')
    await addPointByName(placeSearch, 'Salta', SALTA)
    await addPointByName(placeSearch, 'Cachi', CACHI)

    await waitFor(() =>
      expect(legSummaries()).toEqual(['10 km · 10min · 0 m sin pavimentar']),
    )
    expect(screen.getByText(/^Total:/)).toHaveTextContent(
      'Total: 10 km · 10min · 0 m sin pavimentar',
    )
    expect(routeProvider.requests).toHaveLength(1)

    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(roadmaps.stored.size).toBe(1))
    const saved = [...roadmaps.stored.values()][0]!
    expect(saved.name).toBe('Ida a Cachi')
    expect(saved.points.map((p) => p.name)).toEqual(['Salta', 'Cachi'])
    expect(saved.legs).toHaveLength(1)
    expect(screen.getByRole('dialog', { name: 'Ida a Cachi' })).toBeVisible()
  })
})

describe('editor de Roadmap: secuencia de Points', () => {
  it('insertar entre dos Points reemplaza el tramo por dos nuevos y recalcula solo esos', async () => {
    const { placeSearch, routeProvider } = await openEditor()
    await addPointByName(placeSearch, 'Salta', SALTA)
    await addPointByName(placeSearch, 'Cafayate', CAFAYATE)
    await waitFor(() => expect(legSummaries()).toHaveLength(1))

    await addPointByName(placeSearch, 'Cachi', CACHI, {
      insertButton: 'Insertar Point acá',
    })

    expect(pointNames()).toEqual(['Salta', 'Cachi', 'Cafayate'])
    await waitFor(() => expect(legSummaries()).toHaveLength(2))
    expect(routeProvider.requests.map((r) => r.waypoints.length)).toEqual([
      2, 3,
    ])
  })

  it('subir, bajar y quitar reordenan la secuencia', async () => {
    const { placeSearch } = await openEditor()
    await addPointByName(placeSearch, 'Salta', SALTA)
    await addPointByName(placeSearch, 'Cachi', CACHI)
    await addPointByName(placeSearch, 'Cafayate', CAFAYATE)
    const items = () =>
      within(
        screen.getByRole('list', { name: 'Points del Roadmap' }),
      ).getAllByRole('listitem')

    await userEvent.click(
      within(items()[2]!).getByRole('button', { name: 'Subir' }),
    )
    expect(pointNames()).toEqual(['Salta', 'Cafayate', 'Cachi'])

    await userEvent.click(
      within(items()[0]!).getByRole('button', { name: 'Bajar' }),
    )
    expect(pointNames()).toEqual(['Cafayate', 'Salta', 'Cachi'])

    await userEvent.click(
      within(items()[1]!).getByRole('button', { name: 'Quitar' }),
    )
    expect(pointNames()).toEqual(['Cafayate', 'Cachi'])
    expect(
      within(items()[0]!).getByRole('button', { name: 'Subir' }),
    ).toBeDisabled()
  })

  it('cada Point admite una fecha asociada, que se puede cambiar y quitar', async () => {
    const { placeSearch, roadmaps } = await openEditor()
    await userEvent.type(screen.getByLabelText('Nombre'), 'Ida a Cachi')
    await addPointByName(placeSearch, 'Salta', SALTA)
    await addPointByName(placeSearch, 'Cachi', CACHI)
    const dateOf = (index: number) =>
      screen.getAllByLabelText('Fecha')[index] as HTMLInputElement

    await userEvent.type(dateOf(1), '2026-11-20')
    expect(dateOf(1)).toHaveValue('2026-11-20')
    await userEvent.clear(dateOf(1))
    await userEvent.type(dateOf(1), '2026-11-21')
    expect(dateOf(1)).toHaveValue('2026-11-21')
    await userEvent.clear(dateOf(0))
    expect(dateOf(0)).toHaveValue('')

    await screen.findByText(/Total:/)
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(roadmaps.stored.size).toBe(1))
    expect([...roadmaps.stored.values()][0]!.points.map((p) => p.date)).toEqual(
      [null, '2026-11-21'],
    )
  })
})

describe('editor de Roadmap: cálculo de la ruta', () => {
  it('un tramo sin camino queda señalado, los demás se mantienen y no se puede guardar hasta resolverlo', async () => {
    const routeProvider = new FakeRouteProvider()
    routeProvider.unreachable.push(CAFAYATE)
    const { placeSearch, roadmaps } = await openEditor({ routeProvider })
    await userEvent.type(screen.getByLabelText('Nombre'), 'Ida')
    await addPointByName(placeSearch, 'Salta', SALTA)
    await addPointByName(placeSearch, 'Cachi', CACHI)
    await addPointByName(placeSearch, 'Isla', CAFAYATE)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Sin camino entre estos Points: mové o quitá uno de los dos.',
    )
    expect(legSummaries()).toHaveLength(1)

    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(roadmaps.stored.size).toBe(0)
    expect(
      screen.getByText(
        'Hay un tramo sin camino. Mové o quitá uno de sus Points.',
      ),
    ).toBeVisible()

    const items = within(
      screen.getByRole('list', { name: 'Points del Roadmap' }),
    ).getAllByRole('listitem')
    await userEvent.click(
      within(items[2]!).getByRole('button', { name: 'Quitar' }),
    )

    expect(screen.queryByText(/Sin camino/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(roadmaps.stored.size).toBe(1))
  })

  it('si el motor no responde, el tramo lo indica y ofrece reintentar', async () => {
    const routeProvider = new FakeRouteProvider()
    routeProvider.available = false
    const { placeSearch } = await openEditor({ routeProvider })
    await addPointByName(placeSearch, 'Salta', SALTA)
    await addPointByName(placeSearch, 'Cachi', CACHI)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El motor de ruteo no respondió.',
    )

    routeProvider.available = true
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    await waitFor(() => expect(legSummaries()).toHaveLength(1))
  })

  it('sin conexión se pueden agregar Points, pero el tramo explica que el cálculo requiere conexión y no se guarda', async () => {
    const { placeSearch, connectivity, routeProvider, map } = await openEditor()
    await addPointByName(placeSearch, 'Salta', SALTA)
    await addPointByName(placeSearch, 'Cachi', CACHI)
    await waitFor(() => expect(legSummaries()).toHaveLength(1))
    act(() => connectivity.setOnline(false))

    map.handle.placesInView.mockReturnValue([
      place({ name: 'YPF', type: 'fuel', position: CAFAYATE }),
    ])
    await userEvent.click(screen.getByRole('button', { name: 'Agregar Point' }))
    await userEvent.click(screen.getByRole('tab', { name: 'Lugares por tipo' }))
    await userEvent.click(
      screen.getByRole('button', { name: 'Estación de servicio' }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Elegir' }))

    expect(pointNames()).toEqual(['Salta', 'Cachi', 'YPF'])
    expect(
      screen.getAllByRole('status').map((status) => status.textContent),
    ).toContain('Calcular la ruta requiere conexión')
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
    expect(screen.getByText('Guardar requiere conexión')).toBeVisible()
    expect(routeProvider.requests).toHaveLength(1)

    act(() => connectivity.setOnline(true))

    await waitFor(() => expect(legSummaries()).toHaveLength(2))
  })

  it('el mapa dibuja la ruta por segmentos de superficie y los Points numerados', async () => {
    const routeProvider = new FakeRouteProvider()
    routeProvider.legOverrides = () => ({
      surfaces: [
        { fromIndex: 0, toIndex: 1, surface: 'paved' },
        { fromIndex: 1, toIndex: 2, surface: 'compacted' },
      ],
    })
    const { placeSearch } = await openEditor({ routeProvider })
    await addPointByName(placeSearch, 'Salta', SALTA)
    await addPointByName(placeSearch, 'Cachi', CACHI)

    await waitFor(() =>
      expect(screen.getByTestId('map')).toHaveAttribute(
        'data-route-surfaces',
        'paved,compacted',
      ),
    )
    expect(
      screen.getAllByTestId('marker-point').map((m) => m.textContent),
    ).toEqual(['1', '2'])

    await userEvent.click(
      screen.getByRole('button', { name: 'Referencia de estilos' }),
    )

    const legend = screen.getByLabelText('Referencia de estilos de la ruta')
    expect(legend).toHaveTextContent('Pavimento línea continua')
    expect(legend).toHaveTextContent('Sin dato punto y raya')
  })
})
