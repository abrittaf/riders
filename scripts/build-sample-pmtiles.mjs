/**
 * Genera el archivo PMTiles de prueba del proveedor de ejemplo (`pmtiles-sample`).
 * Baja de OpenFreeMap las teselas de una zona chica (Cachi, Salta) y las empaqueta en un
 * archivo PMTiles v3 (https://github.com/protomaps/PMTiles/blob/main/spec/v3/spec.md).
 *
 * Uso: node scripts/build-sample-pmtiles.mjs
 */
import { writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { zxyToTileId } from 'pmtiles'

const TILE_JSON_URL = 'https://tiles.openfreemap.org/planet'
const OUTPUT = new URL('../public/sample-tiles/cachi.pmtiles', import.meta.url)
const BOUNDS = { west: -66.2, south: -25.15, east: -66.13, north: -25.09 }
const MIN_ZOOM = 8
const MAX_ZOOM = 14
const HEADER_LENGTH = 127
const COMPRESSION_NONE = 1
const COMPRESSION_GZIP = 2
const TILE_TYPE_MVT = 1

function column(longitude, z) {
  return Math.floor(((longitude + 180) / 360) * 2 ** z)
}

function row(latitude, z) {
  const radians = (latitude * Math.PI) / 180
  return Math.floor(
    ((1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2) *
      2 ** z,
  )
}

function varint(value) {
  const bytes = []
  let rest = value
  while (rest >= 0x80) {
    bytes.push((rest % 0x80) | 0x80)
    rest = Math.floor(rest / 0x80)
  }
  bytes.push(rest)
  return bytes
}

function serializeDirectory(entries) {
  const bytes = [...varint(entries.length)]
  let previousId = 0
  for (const entry of entries) {
    bytes.push(...varint(entry.tileId - previousId))
    previousId = entry.tileId
  }
  for (const entry of entries) bytes.push(...varint(entry.runLength))
  for (const entry of entries) bytes.push(...varint(entry.length))
  entries.forEach((entry, index) => {
    const previous = entries[index - 1]
    const isContiguous =
      previous !== undefined &&
      entry.offset === previous.offset + previous.length
    bytes.push(...varint(isContiguous ? 0 : entry.offset + 1))
  })
  return Buffer.from(bytes)
}

const tileJson = await (await fetch(TILE_JSON_URL)).json()
const urlTemplate = tileJson.tiles[0]

const tiles = []
for (let z = MIN_ZOOM; z <= MAX_ZOOM; z++) {
  for (let x = column(BOUNDS.west, z); x <= column(BOUNDS.east, z); x++) {
    for (let y = row(BOUNDS.north, z); y <= row(BOUNDS.south, z); y++) {
      const url = urlTemplate
        .replace('{z}', z)
        .replace('{x}', x)
        .replace('{y}', y)
      const response = await fetch(url)
      if (!response.ok)
        throw new Error(`HTTP ${response.status} al pedir ${url}`)
      const data = gzipSync(Buffer.from(await response.arrayBuffer()))
      tiles.push({ tileId: zxyToTileId(z, x, y), data })
    }
  }
}
tiles.sort((a, b) => a.tileId - b.tileId)

let offset = 0
const entries = tiles.map((tile) => {
  const entry = {
    tileId: tile.tileId,
    runLength: 1,
    length: tile.data.length,
    offset,
  }
  offset += tile.data.length
  return entry
})
const rootDirectory = serializeDirectory(entries)
const metadata = Buffer.from(
  JSON.stringify({
    name: 'Riders: zona de prueba (Cachi, Salta)',
    attribution: tileJson.attribution,
    vector_layers: tileJson.vector_layers,
  }),
)
const tileData = Buffer.concat(tiles.map((tile) => tile.data))

const header = Buffer.alloc(HEADER_LENGTH)
header.write('PMTiles', 0, 'latin1')
header.writeUInt8(3, 7)
const rootOffset = HEADER_LENGTH
const metadataOffset = rootOffset + rootDirectory.length
const tileDataOffset = metadataOffset + metadata.length
header.writeBigUInt64LE(BigInt(rootOffset), 8)
header.writeBigUInt64LE(BigInt(rootDirectory.length), 16)
header.writeBigUInt64LE(BigInt(metadataOffset), 24)
header.writeBigUInt64LE(BigInt(metadata.length), 32)
header.writeBigUInt64LE(BigInt(tileDataOffset), 40) // sin directorios hoja
header.writeBigUInt64LE(0n, 48)
header.writeBigUInt64LE(BigInt(tileDataOffset), 56)
header.writeBigUInt64LE(BigInt(tileData.length), 64)
header.writeBigUInt64LE(BigInt(tiles.length), 72)
header.writeBigUInt64LE(BigInt(tiles.length), 80)
header.writeBigUInt64LE(BigInt(tiles.length), 88)
header.writeUInt8(1, 96) // teselas ordenadas por identificador
header.writeUInt8(COMPRESSION_NONE, 97)
header.writeUInt8(COMPRESSION_GZIP, 98)
header.writeUInt8(TILE_TYPE_MVT, 99)
header.writeUInt8(MIN_ZOOM, 100)
header.writeUInt8(MAX_ZOOM, 101)
header.writeInt32LE(Math.round(BOUNDS.west * 1e7), 102)
header.writeInt32LE(Math.round(BOUNDS.south * 1e7), 106)
header.writeInt32LE(Math.round(BOUNDS.east * 1e7), 110)
header.writeInt32LE(Math.round(BOUNDS.north * 1e7), 114)
header.writeUInt8(MAX_ZOOM - 1, 118)
header.writeInt32LE(Math.round(((BOUNDS.west + BOUNDS.east) / 2) * 1e7), 119)
header.writeInt32LE(Math.round(((BOUNDS.south + BOUNDS.north) / 2) * 1e7), 123)

writeFileSync(
  OUTPUT,
  Buffer.concat([header, rootDirectory, metadata, tileData]),
)
console.log(
  `${tiles.length} teselas (z${MIN_ZOOM}–z${MAX_ZOOM}), ${Math.round((tileDataOffset + tileData.length) / 1024)} KB → ${OUTPUT.pathname}`,
)
