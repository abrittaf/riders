import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { FakePlaceSearch, place } from '../test-support/fake-place-search.ts'
import {
  FakeRiderAccountService,
  sampleProfile,
  sampleRider,
  sampleVehicle,
} from '../test-support/fake-rider-account-service.ts'
import { renderApp } from '../test-support/render-app.tsx'

const SALTA = { latitude: -24.7859, longitude: -65.4117 }

function signedInRider() {
  return new FakeRiderAccountService({
    status: 'signed-in',
    rider: sampleRider,
    profile: sampleProfile,
    vehicle: sampleVehicle,
    pendingSync: false,
  })
}

async function openPointPicker(
  options: { placeSearch?: FakePlaceSearch } = {},
) {
  const app = renderApp({ riderAccount: signedInRider(), ...options })
  app.geolocation.report({ permission: 'granted', lastKnownPosition: SALTA })
  await userEvent.click(screen.getByRole('button', { name: 'Roadmaps' }))
  await userEvent.click(screen.getByRole('button', { name: 'Agregar Point' }))
  return {
    ...app,
    picker: screen.getByRole('region', { name: 'Elegir un Point' }),
  }
}

function pointSequence() {
  return screen.getByRole('list', { name: 'Points del Roadmap' })
}

describe('elegir un Point buscando por nombre', () => {
  it('lista las coincidencias con tipo, localidad y distancia, ordenadas por cercanía, y la elegida pasa a ser un Point', async () => {
    const placeSearch = new FakePlaceSearch()
    placeSearch.results = [
      place({
        name: 'Cachi',
        locality: 'Salta',
        position: { latitude: -25.1199, longitude: -66.1619 },
      }),
      place({
        name: 'YPF Cachi',
        type: 'fuel',
        locality: 'Cachi',
        position: { latitude: -25.12, longitude: -66.16 },
      }),
      place({
        name: 'Cachi',
        locality: 'El Tipal',
        position: { latitude: -24.7605, longitude: -65.4744 },
      }),
    ]
    const { picker } = await openPointPicker({ placeSearch })

    await userEvent.type(
      within(picker).getByLabelText('Nombre del lugar'),
      'Cachi',
    )
    await userEvent.click(
      within(picker).getByRole('button', { name: 'Buscar' }),
    )

    const items = await within(picker).findAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual([
      'CachiEl Tipal · 6,9 kmElegir',
      'YPF CachiEstación de servicio · Cachi · 84,1 kmElegir',
      'CachiSalta · 84,3 kmElegir',
    ])
    expect(placeSearch.queries).toEqual([{ query: 'Cachi', near: SALTA }])

    await userEvent.click(
      within(items[1]!).getByRole('button', { name: 'Elegir' }),
    )

    expect(pointSequence()).toHaveTextContent('YPF CachiEstación de servicio')
  })

  it('sin coincidencias lo dice y sugiere tocar el mapa', async () => {
    const { picker } = await openPointPicker()

    await userEvent.type(
      within(picker).getByLabelText('Nombre del lugar'),
      'xqzv',
    )
    await userEvent.click(
      within(picker).getByRole('button', { name: 'Buscar' }),
    )

    expect(await within(picker).findByRole('status')).toHaveTextContent(
      'No encontramos ningún lugar con ese nombre. Mantené el dedo sobre el mapa para elegir la posición a mano.',
    )
  })

  it('sin conexión la búsqueda está señalada como no disponible y las otras formas siguen ofrecidas', async () => {
    const { picker, connectivity } = await openPointPicker()

    act(() => connectivity.setOnline(false))

    expect(within(picker).getByLabelText('Nombre del lugar')).toBeDisabled()
    expect(
      within(picker).getByText('La búsqueda por nombre requiere conexión'),
    ).toBeVisible()
    expect(
      within(picker).getByRole('tab', { name: 'Lugares por tipo' }),
    ).toBeEnabled()
    expect(
      within(picker).getByText(/mantener el dedo sobre el mapa/),
    ).toBeVisible()
  })

  it('si el buscador falla, lo informa y permite reintentar', async () => {
    const placeSearch = new FakePlaceSearch()
    placeSearch.available = false
    const { picker } = await openPointPicker({ placeSearch })

    await userEvent.type(
      within(picker).getByLabelText('Nombre del lugar'),
      'Cachi',
    )
    await userEvent.click(
      within(picker).getByRole('button', { name: 'Buscar' }),
    )

    expect(await within(picker).findByRole('alert')).toHaveTextContent(
      'No se pudo consultar el buscador',
    )
    expect(within(picker).getByRole('button', { name: 'Buscar' })).toBeEnabled()
  })
})

describe('elegir un Point por tipo entre lo visible', () => {
  it('lista los lugares del tipo con nombre y distancia, los resalta sobre el mapa y la elegida conserva el tipo', async () => {
    const { picker, map } = await openPointPicker()
    map.handle.placesInView.mockReturnValue([
      place({
        name: 'Shell',
        type: 'fuel',
        position: { latitude: -24.79, longitude: -65.42 },
      }),
      place({
        name: 'YPF',
        type: 'fuel',
        position: { latitude: -24.786, longitude: -65.412 },
      }),
    ])

    await userEvent.click(
      within(picker).getByRole('tab', { name: 'Lugares por tipo' }),
    )
    await userEvent.click(
      within(picker).getByRole('button', { name: 'Estación de servicio' }),
    )

    expect(map.handle.placesInView).toHaveBeenCalledWith(['fuel'])
    const items = within(picker).getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual([
      'YPFEstación de servicio · 32 mElegir',
      'ShellEstación de servicio · 954 mElegir',
    ])
    expect(screen.getAllByTestId('marker-highlighted-place')).toHaveLength(2)

    await userEvent.click(
      within(items[0]!).getByRole('button', { name: 'Elegir' }),
    )

    expect(pointSequence()).toHaveTextContent('YPFEstación de servicio')
    expect(screen.queryAllByTestId('marker-highlighted-place')).toHaveLength(0)
  })

  it('sin lugares del tipo en la vista lo indica y sugiere alejar el mapa', async () => {
    const { picker } = await openPointPicker()

    await userEvent.click(
      within(picker).getByRole('tab', { name: 'Lugares por tipo' }),
    )
    await userEvent.click(
      within(picker).getByRole('button', { name: 'Alojamiento' }),
    )

    expect(within(picker).getByRole('status')).toHaveTextContent(
      'No hay alojamientos en la zona visible. Alejá el mapa o desplazalo.',
    )
  })

  it('funciona sin conexión: lee las teselas, no al buscador', async () => {
    const { picker, map, connectivity, placeSearch } = await openPointPicker()
    act(() => connectivity.setOnline(false))
    map.handle.placesInView.mockReturnValue([
      place({ name: 'Hostal del Valle', type: 'lodging' }),
    ])

    await userEvent.click(
      within(picker).getByRole('tab', { name: 'Lugares por tipo' }),
    )
    await userEvent.click(
      within(picker).getByRole('button', { name: 'Alojamiento' }),
    )

    expect(within(picker).getByRole('listitem')).toHaveTextContent(
      'Hostal del Valle',
    )
    expect(placeSearch.queries).toHaveLength(0)
  })
})

describe('elegir una posición con toque sostenido', () => {
  it('con conexión propone el nombre del lugar más cercano, que se puede cambiar antes de confirmar', async () => {
    const placeSearch = new FakePlaceSearch()
    placeSearch.nearest = place({ name: 'Sarmiento', locality: 'Cachi' })
    const { map } = await openPointPicker({ placeSearch })

    act(() => map.longPress({ latitude: -25.1197, longitude: -66.1656 }))

    const nameField = await screen.findByLabelText('Nombre del Point')
    expect(nameField).toHaveDisplayValue('Sarmiento')
    expect(screen.getByText('-25,1197, -66,1656')).toBeVisible()

    await userEvent.clear(nameField)
    await userEvent.type(nameField, 'Hostería en Cachi')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(pointSequence()).toHaveTextContent('Hostería en Cachi')
  })

  it('sin conexión propone las coordenadas como nombre, editable', async () => {
    const { map, connectivity, placeSearch } = await openPointPicker()
    act(() => connectivity.setOnline(false))

    act(() => map.longPress({ latitude: -25.1197, longitude: -66.1656 }))

    expect(screen.getByLabelText('Nombre del Point')).toHaveDisplayValue(
      '-25,1197, -66,1656',
    )
    expect(placeSearch.queries).toHaveLength(0)

    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(pointSequence()).toHaveTextContent('-25,1197, -66,1656')
  })

  it('cancelar la posición vuelve al selector sin agregar un Point', async () => {
    const { map } = await openPointPicker()

    act(() => map.longPress({ latitude: -25.1197, longitude: -66.1656 }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(
      screen.getByRole('region', { name: 'Elegir un Point' }),
    ).toBeVisible()
    expect(
      screen.queryByRole('list', { name: 'Points del Roadmap' }),
    ).not.toBeInTheDocument()
  })
})
