// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { TileUnavailableError } from '../../tile-source.ts'
import { OpenFreeMapTileSource } from './openfreemap-tile-source.ts'

const SERVER = { serverUrl: 'https://mapas.example', tileSetName: 'planet' }
const TILE = { z: 14, x: 5180, y: 9373 }
const TILE_BYTES = new Uint8Array([1, 2, 3]).buffer

/** Servidor simulado: publica la compilación vigente en el TileJSON y sirve sus teselas. */
function simulatedServer(build = '20260927_080001_pt') {
  const state = { build, online: true }
  const fetchFromServer = vi.fn(
    (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input)
      if (!state.online) return Promise.reject(new TypeError('Failed to fetch'))
      if (url === 'https://mapas.example/planet') {
        return Promise.resolve(
          Response.json({
            tiles: [
              `https://mapas.example/planet/${state.build}/{z}/{x}/{y}.pbf`,
            ],
          }),
        )
      }
      return Promise.resolve(
        url.includes(`/planet/${state.build}/`)
          ? new Response(TILE_BYTES)
          : new Response(null, { status: 404 }),
      )
    },
  )
  return {
    state,
    fetchFromServer: fetchFromServer as unknown as typeof fetch,
    calls: fetchFromServer.mock.calls,
  }
}

describe('teselas de OpenFreeMap', () => {
  it('pide la tesela a la compilación vigente que publica el servidor e informa su versión', async () => {
    const server = simulatedServer('20260927_080001_pt')
    const tileSource = new OpenFreeMapTileSource(
      SERVER,
      'default',
      server.fetchFromServer,
    )

    const tile = await tileSource.getTile(TILE)

    expect(tile.version).toBe('20260927_080001_pt')
    expect(new Uint8Array(tile.data)).toEqual(new Uint8Array([1, 2, 3]))
    expect(server.calls.map(([url]) => url)).toEqual([
      'https://mapas.example/planet',
      'https://mapas.example/planet/20260927_080001_pt/14/5180/9373.pbf',
    ])
  })

  it('consulta la compilación vigente una sola vez para muchas teselas', async () => {
    const server = simulatedServer()
    const tileSource = new OpenFreeMapTileSource(
      SERVER,
      'default',
      server.fetchFromServer,
    )

    await Promise.all([
      tileSource.getTile(TILE),
      tileSource.getTile({ z: 0, x: 0, y: 0 }),
      tileSource.getTile({ z: 1, x: 0, y: 1 }),
    ])

    expect(
      server.calls.filter(([url]) => url === 'https://mapas.example/planet'),
    ).toHaveLength(1)
  })

  it('vuelve a consultar la compilación vigente pasadas unas horas, porque el servidor publica una nueva cada semana', async () => {
    const server = simulatedServer('20260927_080001_pt')
    let now = 0
    const tileSource = new OpenFreeMapTileSource(
      SERVER,
      'default',
      server.fetchFromServer,
      () => now,
    )
    await tileSource.getTile(TILE)

    server.state.build = '20261004_080001_pt'
    now += 7 * 60 * 60 * 1000

    expect((await tileSource.getTile(TILE)).version).toBe('20261004_080001_pt')
  })

  it('sin conectividad informa la tesela como no disponible, y se recupera cuando vuelve la red', async () => {
    const server = simulatedServer()
    const tileSource = new OpenFreeMapTileSource(
      SERVER,
      'default',
      server.fetchFromServer,
    )
    server.state.online = false

    await expect(tileSource.getTile(TILE)).rejects.toThrow(TileUnavailableError)

    server.state.online = true
    await expect(tileSource.getTile(TILE)).resolves.toBeDefined()
  })

  it('informa como no disponible una tesela que el servidor no entrega', async () => {
    const server = simulatedServer()
    const tileSource = new OpenFreeMapTileSource(
      SERVER,
      'default',
      server.fetchFromServer,
    )
    await tileSource.getTile(TILE)
    server.state.build = 'otra-compilacion'

    await expect(tileSource.getTile(TILE)).rejects.toThrow(TileUnavailableError)
  })

  it.each(['default', 'no-store'] as const)(
    'pide las teselas con la política de caché «%s» que se le indica',
    async (httpCaching) => {
      const server = simulatedServer()
      const tileSource = new OpenFreeMapTileSource(
        SERVER,
        httpCaching,
        server.fetchFromServer,
      )

      await tileSource.getTile(TILE)

      expect(server.calls.at(-1)?.[1]).toMatchObject({ cache: httpCaching })
    },
  )

  it('una petición cancelada no se informa como tesela no disponible', async () => {
    const abort = new AbortController()
    const fetchAborted = vi.fn((input: RequestInfo | URL) =>
      String(input).endsWith('/planet')
        ? Promise.resolve(
            Response.json({
              tiles: ['https://mapas.example/planet/v/{z}/{x}/{y}.pbf'],
            }),
          )
        : Promise.reject(new DOMException('Cancelada', 'AbortError')),
    ) as unknown as typeof fetch
    const tileSource = new OpenFreeMapTileSource(
      SERVER,
      'default',
      fetchAborted,
    )

    const request = tileSource.getTile(TILE, abort.signal)

    await expect(request).rejects.toMatchObject({ name: 'AbortError' })
    await expect(request).rejects.not.toBeInstanceOf(TileUnavailableError)
  })
})
