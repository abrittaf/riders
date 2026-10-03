// @vitest-environment node
import type { Source } from 'pmtiles'
import { describe, expect, it } from 'vitest'
import sampleArchive from '../../../../public/sample-tiles/cachi.pmtiles?inline'
import { TileUnavailableError } from '../../tile-source.ts'
import { PmtilesTileSource } from './pmtiles-tile-source.ts'

const GZIP_MAGIC = [0x1f, 0x8b]

function inMemorySource(dataUrl: string): Source {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
  return {
    getKey: () => 'archivo-de-prueba',
    getBytes: (offset, length) =>
      Promise.resolve({
        data: bytes.slice(offset, offset + length).buffer,
      }),
  }
}

const unreadableSource: Source = {
  getKey: () => 'archivo-ilegible',
  getBytes: () => Promise.reject(new Error('No se puede leer el archivo')),
}

describe('teselas desde un archivo PMTiles', () => {
  const tileSource = new PmtilesTileSource(inMemorySource(sampleArchive))
  // Cachi, Salta: la zona que cubre el archivo de prueba.
  const tileOverCachi = { z: 14, x: 5180, y: 9373 }

  it('entrega la tesela vectorial sin comprimir, lista para el renderizador', async () => {
    const tile = await tileSource.getTile(tileOverCachi)

    const firstBytes = [...new Uint8Array(tile.data.slice(0, 2))]
    expect(tile.data.byteLength).toBeGreaterThan(100)
    expect(firstBytes).not.toEqual(GZIP_MAGIC)
  })

  it('informa como no disponible una tesela que el archivo no contiene', async () => {
    await expect(tileSource.getTile({ z: 14, x: 0, y: 0 })).rejects.toThrow(
      TileUnavailableError,
    )
  })

  it('informa como no disponible cualquier tesela si el archivo no se puede leer', async () => {
    const missing = new PmtilesTileSource(unreadableSource)

    await expect(missing.getTile(tileOverCachi)).rejects.toThrow(
      TileUnavailableError,
    )
  })
})
