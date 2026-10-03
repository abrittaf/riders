// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DownloadNotAllowedError,
  type OfflineRegion,
  type OfflineRegionStore,
} from '../offline-region-store.ts'
import { tileBounds } from '../tile-math.ts'
import {
  createStoreForTest,
  resetStoredMapData,
} from './offline-test-support.ts'
import { OfflineFirstTileSource } from './offline-first-tile-source.ts'

/** Un punto: una tesela por nivel de detalle, 15 en total. */
const CACHI = { west: -66.165, south: -25.12, east: -66.165, north: -25.12 }
const CACHI_TILE_COUNT = 15
/**
 * El interior de una tesela de nivel 9: 1 tesela por nivel hasta el 9 y 4, 16, 64, 256 y 1.024
 * en los niveles 10 a 14. En total, 1.374.
 */
const WHOLE_VALLEY = (() => {
  const tile = tileBounds({ z: 9, x: 161, y: 292 })
  const marginX = (tile.east - tile.west) / 1000
  const marginY = (tile.north - tile.south) / 1000
  return {
    west: tile.west + marginX,
    east: tile.east - marginX,
    south: tile.south + marginY,
    north: tile.north - marginY,
  }
})()

async function untilRegion(
  store: OfflineRegionStore,
  regionId: string,
  condition: (region: OfflineRegion) => boolean,
): Promise<OfflineRegion> {
  return vi.waitFor(async () => {
    const region = (await store.listRegions()).find(({ id }) => id === regionId)
    if (!region || !condition(region)) {
      throw new Error(`La zona todavía está: ${JSON.stringify(region)}`)
    }
    return region
  })
}

const isComplete = (region: OfflineRegion) => region.status === 'complete'
const isPaused = (region: OfflineRegion) => region.status === 'paused'

beforeEach(resetStoredMapData)

describe('descarga de una zona', () => {
  it('informa el tamaño estimado antes de confirmar', async () => {
    const { store } = createStoreForTest()

    const plan = await store.planDownload(CACHI)

    expect(plan).toMatchObject({
      outcome: 'ready',
      tileCount: CACHI_TILE_COUNT,
    })
    expect(
      plan.outcome === 'ready' && plan.estimatedSizeInBytes,
    ).toBeGreaterThan(0)
  })

  it('descarga todas las teselas de la zona, informa el progreso y la deja disponible sin conexión', async () => {
    const { store, server, storedResourceUrls } = createStoreForTest()
    const progress: number[] = []
    store.subscribe(() => {
      void store
        .listRegions()
        .then(([region]) => region && progress.push(region.downloadedTileCount))
    })

    const started = await store.startDownload('Cachi', CACHI)
    expect(started).toMatchObject({
      name: 'Cachi',
      status: 'downloading',
      totalTileCount: CACHI_TILE_COUNT,
      downloadedTileCount: 0,
    })

    const region = await untilRegion(store, started.id, isComplete)
    expect(region).toMatchObject({
      downloadedTileCount: CACHI_TILE_COUNT,
      sizeInBytes: CACHI_TILE_COUNT * server.tileSizeInBytes,
      downloadedAt: new Date('2026-10-03T12:00:00Z'),
      pauseReason: null,
    })
    expect(new Set(server.requested).size).toBe(CACHI_TILE_COUNT)
    expect(
      progress.some((count) => count > 0 && count < CACHI_TILE_COUNT),
    ).toBe(true)
    expect(progress).toEqual([...progress].sort((a, b) => a - b))
    expect(storedResourceUrls).toEqual([
      'https://mapas.example/fonts/0-255.pbf',
    ])
  })

  it('guarda con cada tesela la versión de los datos que publicó el proveedor', async () => {
    const { store, server, database } = createStoreForTest()
    server.version = '20260927_080001_pt'

    const { id } = await store.startDownload('Cachi', CACHI)
    await untilRegion(store, id, isComplete)

    expect(await database.tileVersions(id)).toEqual(
      new Set(['20260927_080001_pt']),
    )
  })

  it('no pide al servidor más teselas a la vez que el paralelismo configurado', async () => {
    const { store, server } = createStoreForTest({
      downloadConcurrency: 3,
      maxTilesPerRegion: 2_000,
    })

    const { id } = await store.startDownload('Valle', WHOLE_VALLEY)
    await untilRegion(store, id, (region) => region.downloadedTileCount > 30)
    await store.pauseDownload(id)

    expect(server.maxSimultaneousRequests).toBe(3)
  })

  it('rechaza una zona que supera el máximo de teselas e indica cuánto acercar el mapa', async () => {
    const { store, server } = createStoreForTest({ maxTilesPerRegion: 100 })

    const plan = await store.planDownload(WHOLE_VALLEY)

    expect(plan).toEqual({
      outcome: 'too-large',
      tileCount: 1374,
      maxTileCount: 100,
      zoomLevelsToZoomIn: 3,
    })
    await expect(store.startDownload('Valle', WHOLE_VALLEY)).rejects.toThrow(
      DownloadNotAllowedError,
    )
    expect(await store.listRegions()).toEqual([])
    expect(server.requested).toEqual([])
  })

  it('no inicia la descarga si el tamaño estimado supera el espacio disponible en el celular', async () => {
    const { store, server, deviceStorage } = createStoreForTest()
    deviceStorage.space = { usageInBytes: 900_000, quotaInBytes: 1_000_000 }

    const plan = await store.planDownload(CACHI)

    expect(plan).toMatchObject({
      outcome: 'insufficient-space',
      availableBytes: 100_000,
    })
    await expect(store.startDownload('Cachi', CACHI)).rejects.toThrow(
      DownloadNotAllowedError,
    )
    expect(await store.listRegions()).toEqual([])
    expect(server.requested).toEqual([])
  })

  it('al perder la conectividad queda en pausa conservando lo descargado y retoma desde donde quedó cuando vuelve', async () => {
    const { store, server, connectivity } = createStoreForTest({
      downloadConcurrency: 1,
    })
    await store.initialize()
    server.goOfflineAfter = 6

    const { id } = await store.startDownload('Cachi', CACHI)
    const paused = await untilRegion(store, id, isPaused)

    expect(paused).toMatchObject({
      pauseReason: 'connectivity',
      downloadedTileCount: 6,
      sizeInBytes: 6 * server.tileSizeInBytes,
    })
    const requestedBeforeResuming = server.requested.length

    server.restoreNetwork()
    connectivity.setOnline(true)
    const resumed = await untilRegion(store, id, isComplete)

    expect(resumed.downloadedTileCount).toBe(CACHI_TILE_COUNT)
    expect(server.requested.length - requestedBeforeResuming).toBe(
      CACHI_TILE_COUNT - 6,
    )
  })

  it('el Rider puede pausar una descarga y retomarla sin volver a bajar lo que ya tiene', async () => {
    const { store, server, connectivity } = createStoreForTest({
      downloadConcurrency: 1,
      maxTilesPerRegion: 2_000,
    })
    await store.initialize()

    const { id } = await store.startDownload('Valle', WHOLE_VALLEY)
    await untilRegion(store, id, (region) => region.downloadedTileCount >= 10)
    await store.pauseDownload(id)
    const paused = await untilRegion(store, id, isPaused)
    const requestedWhilePaused = server.requested.length

    connectivity.setOnline(true)
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(paused.pauseReason).toBe('manual')
    expect(server.requested.length).toBe(requestedWhilePaused)

    await store.resumeDownload(id)
    await untilRegion(
      store,
      id,
      (region) => region.downloadedTileCount > paused.downloadedTileCount + 5,
    )
    await store.pauseDownload(id)

    expect(new Set(server.requested).size).toBe(server.requested.length)
  })

  it('retoma al abrir la app una descarga que quedó interrumpida al cerrarla', async () => {
    const first = createStoreForTest({ downloadConcurrency: 1 })
    first.server.goOfflineAfter = 4
    const { id } = await first.store.startDownload('Cachi', CACHI)
    await untilRegion(first.store, id, isPaused)

    const reopened = createStoreForTest()
    await reopened.store.initialize()
    const region = await untilRegion(reopened.store, id, isComplete)

    expect(region.downloadedTileCount).toBe(CACHI_TILE_COUNT)
    expect(reopened.server.requested).toHaveLength(CACHI_TILE_COUNT - 4)
  })

  it('«actualizar zona» vuelve a descargar todas las teselas con la versión vigente', async () => {
    const { store, server, database } = createStoreForTest()
    const { id } = await store.startDownload('Cachi', CACHI)
    await untilRegion(store, id, isComplete)
    server.version = '20261004_080001_pt'
    server.tileSizeInBytes = 1_500

    await store.refreshRegion(id)
    const refreshed = await untilRegion(store, id, isComplete)

    expect(await database.tileVersions(id)).toEqual(
      new Set(['20261004_080001_pt']),
    )
    expect(refreshed).toMatchObject({
      downloadedTileCount: CACHI_TILE_COUNT,
      sizeInBytes: CACHI_TILE_COUNT * 1_500,
    })
  })
})

describe('mapa de las zonas descargadas sin conexión', () => {
  const tileOverCachi = { z: 14, x: 5180, y: 9373 }
  const tileOverBuenosAires = { z: 14, x: 5534, y: 9871 }

  it('sin red entrega las teselas de la zona descargada y avisa que las demás no están disponibles', async () => {
    const { store, server, database } = createStoreForTest()
    const { id } = await store.startDownload('Cachi', CACHI)
    await untilRegion(store, id, isComplete)
    const tileSource = new OfflineFirstTileSource(database, server)
    server.online = false

    const tile = await tileSource.getTile(tileOverCachi)

    expect(tile.data.byteLength).toBe(server.tileSizeInBytes)
    await expect(tileSource.getTile(tileOverBuenosAires)).rejects.toThrow(
      /no disponible/,
    )
  })

  it('con red usa lo guardado sin volver a pedirlo y pide a la red lo que falta', async () => {
    const { store, server, database } = createStoreForTest()
    const { id } = await store.startDownload('Cachi', CACHI)
    await untilRegion(store, id, isComplete)
    const tileSource = new OfflineFirstTileSource(database, server)
    const requestedByDownload = server.requested.length

    await tileSource.getTile(tileOverCachi)
    expect(server.requested).toHaveLength(requestedByDownload)

    await tileSource.getTile(tileOverBuenosAires)
    expect(server.requested).toHaveLength(requestedByDownload + 1)
  })

  it('sin red entrega lo que alcanzó a descargarse de una zona en pausa', async () => {
    const { store, server, database } = createStoreForTest({
      downloadConcurrency: 1,
    })
    server.goOfflineAfter = 5
    const { id } = await store.startDownload('Cachi', CACHI)
    await untilRegion(store, id, isPaused)
    const tileSource = new OfflineFirstTileSource(database, server)

    await expect(
      tileSource.getTile({ z: 0, x: 0, y: 0 }),
    ).resolves.toBeDefined()
    await expect(tileSource.getTile(tileOverCachi)).rejects.toThrow(
      /no disponible/,
    )
  })
})

describe('gestión de las zonas descargadas', () => {
  it('lista las zonas con su nombre, tamaño ocupado y fecha, de la más reciente a la más antigua', async () => {
    let today = '2026-10-01T10:00:00Z'
    const { store } = createStoreForTest({ now: () => new Date(today) })
    const first = await store.startDownload('Cachi', CACHI)
    await untilRegion(store, first.id, isComplete)
    today = '2026-10-03T10:00:00Z'
    const second = await store.startDownload('Molinos', {
      west: -66.3,
      south: -25.44,
      east: -66.3,
      north: -25.44,
    })
    await untilRegion(store, second.id, isComplete)

    const regions = await store.listRegions()

    expect(
      regions.map(({ name, sizeInBytes, downloadedAt }) => ({
        name,
        sizeInBytes,
        downloadedAt,
      })),
    ).toEqual([
      {
        name: 'Molinos',
        sizeInBytes: 15_000,
        downloadedAt: new Date('2026-10-03T10:00:00Z'),
      },
      {
        name: 'Cachi',
        sizeInBytes: 15_000,
        downloadedAt: new Date('2026-10-01T10:00:00Z'),
      },
    ])
    expect((await store.getStorageUsage()).regionsSizeInBytes).toBe(30_000)
  })

  it('al borrar una zona desaparece de la lista, libera su espacio y su mapa deja de estar disponible sin conexión', async () => {
    const { store, server, database } = createStoreForTest()
    const { id } = await store.startDownload('Cachi', CACHI)
    await untilRegion(store, id, isComplete)

    await store.deleteRegion(id)
    server.online = false

    expect(await store.listRegions()).toEqual([])
    expect((await store.getStorageUsage()).regionsSizeInBytes).toBe(0)
    await expect(
      new OfflineFirstTileSource(database, server).getTile({
        z: 0,
        x: 0,
        y: 0,
      }),
    ).rejects.toThrow(/no disponible/)
  })

  it('borrar una zona conserva las teselas de las demás', async () => {
    const { store, server, database } = createStoreForTest()
    const cachi = await store.startDownload('Cachi', CACHI)
    const copy = await store.startDownload('Cachi otra vez', CACHI)
    await untilRegion(store, cachi.id, isComplete)
    await untilRegion(store, copy.id, isComplete)

    await store.deleteRegion(cachi.id)
    server.online = false

    await expect(
      new OfflineFirstTileSource(database, server).getTile({
        z: 0,
        x: 0,
        y: 0,
      }),
    ).resolves.toBeDefined()
  })

  it('borrar una zona mientras se descarga detiene la descarga', async () => {
    const { store, server } = createStoreForTest({
      downloadConcurrency: 1,
      maxTilesPerRegion: 2_000,
    })
    const { id } = await store.startDownload('Valle', WHOLE_VALLEY)
    await untilRegion(store, id, (region) => region.downloadedTileCount >= 5)

    await store.deleteRegion(id)
    const requestedWhenDeleted = server.requested.length
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(server.requested.length).toBe(requestedWhenDeleted)
    expect(await store.listRegions()).toEqual([])
  })
})

describe('persistencia y espacio del celular', () => {
  it('pide almacenamiento persistente una sola vez, aunque el arranque se repita', async () => {
    const { store, deviceStorage } = createStoreForTest()

    await Promise.all([store.initialize(), store.initialize()])
    await store.initialize()

    expect(deviceStorage.persistenceRequests).toBe(1)
  })

  it('no vuelve a pedirlo si el navegador ya lo había concedido', async () => {
    const { store, deviceStorage } = createStoreForTest()
    deviceStorage.persistent = true

    await store.initialize()

    expect(deviceStorage.persistenceRequests).toBe(0)
  })

  it('informa el espacio que ocupan las zonas y el disponible en el celular', async () => {
    const { store, deviceStorage } = createStoreForTest()
    deviceStorage.space = {
      usageInBytes: 2_000_000_000,
      quotaInBytes: 5_000_000_000,
    }
    const { id } = await store.startDownload('Cachi', CACHI)
    await untilRegion(store, id, isComplete)

    expect(await store.getStorageUsage()).toEqual({
      regionsSizeInBytes: 15_000,
      availableBytes: 3_000_000_000,
      isRunningLow: false,
    })
  })

  it('cuando el navegador no informa el espacio, igual informa lo que ocupan las zonas', async () => {
    const { store, deviceStorage } = createStoreForTest()
    deviceStorage.space = null

    expect(await store.getStorageUsage()).toEqual({
      regionsSizeInBytes: 0,
      availableBytes: null,
      isRunningLow: false,
    })
    expect((await store.planDownload(CACHI)).outcome).toBe('ready')
  })

  it('cuando el almacenamiento está por agotarse lo avisa sin borrar ninguna zona', async () => {
    const { store, deviceStorage } = createStoreForTest({
      lowStorageThresholdInBytes: 100_000_000,
    })
    const { id } = await store.startDownload('Cachi', CACHI)
    await untilRegion(store, id, isComplete)

    deviceStorage.space = {
      usageInBytes: 4_950_000_000,
      quotaInBytes: 5_000_000_000,
    }

    expect((await store.getStorageUsage()).isRunningLow).toBe(true)
    expect(await store.listRegions()).toHaveLength(1)
    expect((await store.listRegions())[0]).toMatchObject({
      status: 'complete',
      downloadedTileCount: CACHI_TILE_COUNT,
    })
  })
})
