// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { PlaceSearchUnavailableError } from '../../place-search.ts'
import { RequestPacer } from '../request-pacer.ts'
import reverseCachi from './fixtures/reverse-cachi.json'
import searchAddress from './fixtures/search-address.json'
import searchCachi from './fixtures/search-cachi.json'
import searchFuel from './fixtures/search-fuel.json'
import searchNoMatch from './fixtures/search-no-match.json'
import { PhotonPlaceSearch } from './photon-place-search.ts'

const SERVER = 'https://lugares.example'
const CONFIG = { serverUrl: SERVER, maxResults: 5 }
const SALTA = { latitude: -24.7859, longitude: -65.4117 }
const CACHI = { latitude: -25.1197, longitude: -66.1656 }

type Reply = { status: number; body: unknown } | 'offline'

function simulatedServer(reply: Reply) {
  const requests: URL[] = []
  const fetchFromServer = vi.fn((input: RequestInfo | URL) => {
    requests.push(new URL(String(input)))
    if (reply === 'offline') {
      return Promise.reject(new TypeError('Failed to fetch'))
    }
    return Promise.resolve(Response.json(reply.body, { status: reply.status }))
  })
  return {
    requests,
    fetchFromServer: fetchFromServer as unknown as typeof fetch,
  }
}

function createSearch(server: ReturnType<typeof simulatedServer>) {
  return new PhotonPlaceSearch(
    CONFIG,
    new RequestPacer(1000, { now: () => 0, sleep: () => Promise.resolve() }),
    server.fetchFromServer,
  )
}

describe('búsqueda de lugares con Photon', () => {
  it('busca por nombre cerca de una posición, sin pedir idioma, y devuelve las coincidencias con nombre, tipo y localidad', async () => {
    const server = simulatedServer({ status: 200, body: searchCachi })

    const places = await createSearch(server).searchByName('Cachi', SALTA)

    const request = server.requests[0]!
    expect(request.pathname).toBe('/api')
    expect(Object.fromEntries(request.searchParams)).toEqual({
      q: 'Cachi',
      lat: '-24.7859',
      lon: '-65.4117',
      limit: '5',
    })
    expect(places).toHaveLength(5)
    expect(places[0]).toEqual({
      name: 'Cachi',
      position: { latitude: -25.1198873, longitude: -66.1619367 },
      type: null,
      locality: 'Salta',
    })
    expect(places[2]).toMatchObject({ name: 'Cachi', locality: 'El Tipal' })
    expect(places[4]).toMatchObject({
      name: 'Cachi Adentro',
      locality: 'Cachi',
    })
  })

  it('reconoce el tipo de lugar por sus etiquetas de OpenStreetMap', async () => {
    const server = simulatedServer({ status: 200, body: searchFuel })

    const places = await createSearch(server).searchByName('YPF', CACHI)

    expect(places.map((place) => place.type)).toEqual(['fuel', 'fuel', 'fuel'])
    expect(places[1]).toMatchObject({ name: 'YPF', locality: 'Chicoana' })
  })

  it('sin coincidencias devuelve una lista vacía', async () => {
    const server = simulatedServer({ status: 200, body: searchNoMatch })

    await expect(
      createSearch(server).searchByName('xqzvwyjk', SALTA),
    ).resolves.toEqual([])
  })

  it('un lugar sin nombre propio se nombra con su calle y su número', async () => {
    const server = simulatedServer({ status: 200, body: searchAddress })

    const places = await createSearch(server).searchByName(
      'Caseros 1500 Salta',
      SALTA,
    )

    expect(places[0]).toEqual({
      name: 'Caseros 1500',
      position: { latitude: -24.7889005, longitude: -65.42357 },
      type: null,
      locality: 'Salta',
    })
  })

  it('un lugar sin nombre ni dirección se descarta', async () => {
    const server = simulatedServer({
      status: 200,
      body: {
        features: [
          {
            geometry: { coordinates: [-65.4, -24.8] },
            properties: { osm_key: 'natural', osm_value: 'water' },
          },
        ],
      },
    })

    await expect(
      createSearch(server).searchByName('laguna', SALTA),
    ).resolves.toEqual([])
  })

  it('resuelve la dirección más cercana a una posición', async () => {
    const server = simulatedServer({ status: 200, body: reverseCachi })

    const place = await createSearch(server).findNearestPlace(CACHI)

    const request = server.requests[0]!
    expect(request.pathname).toBe('/reverse')
    expect(Object.fromEntries(request.searchParams)).toEqual({
      lat: '-25.1197',
      lon: '-66.1656',
      limit: '1',
    })
    expect(place).toEqual({
      name: 'Sarmiento',
      position: { latitude: -25.1203676, longitude: -66.1653822 },
      type: null,
      locality: 'Cachi',
    })
  })

  it('sin nada cerca de la posición no propone ningún lugar', async () => {
    const server = simulatedServer({ status: 200, body: searchNoMatch })

    await expect(
      createSearch(server).findNearestPlace({ latitude: -50, longitude: -40 }),
    ).resolves.toBeNull()
  })

  it.each([
    ['sin conectividad', 'offline' as const],
    ['con un error del servidor', { status: 503, body: {} }],
    ['cuando el servidor limita las consultas', { status: 429, body: {} }],
  ])('informa el buscador como no disponible %s', async (_, reply) => {
    const server = simulatedServer(reply)

    await expect(
      createSearch(server).searchByName('Cachi', SALTA),
    ).rejects.toThrow(PlaceSearchUnavailableError)
  })

  it('espacia sus consultas según la condición de uso del servidor', async () => {
    const sleep = vi.fn(() => Promise.resolve())
    const server = simulatedServer({ status: 200, body: searchNoMatch })
    const search = new PhotonPlaceSearch(
      CONFIG,
      new RequestPacer(1000, { now: () => 0, sleep }),
      server.fetchFromServer,
    )

    await search.searchByName('a', SALTA)
    await search.searchByName('b', SALTA)

    expect(sleep).toHaveBeenCalledWith(1000, undefined)
  })

  it('una consulta cancelada no se informa como buscador no disponible', async () => {
    const abort = new AbortController()
    const fetchAborted = vi.fn(() =>
      Promise.reject(new DOMException('Cancelada', 'AbortError')),
    ) as unknown as typeof fetch
    const search = new PhotonPlaceSearch(
      CONFIG,
      new RequestPacer(1000, { now: () => 0, sleep: () => Promise.resolve() }),
      fetchAborted,
    )

    await expect(
      search.searchByName('Cachi', SALTA, abort.signal),
    ).rejects.toMatchObject({ name: 'AbortError' })
  })
})
