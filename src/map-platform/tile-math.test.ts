// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  tileBounds,
  tileCountsByZoom,
  tilesCovering,
  totalTileCount,
  zoomedInBounds,
} from './tile-math.ts'

const ALL_ZOOM_LEVELS = { minZoom: 0, maxZoom: 14 }

function shrunk(bounds: ReturnType<typeof tileBounds>) {
  const marginX = (bounds.east - bounds.west) / 100
  const marginY = (bounds.north - bounds.south) / 100
  return {
    west: bounds.west + marginX,
    east: bounds.east - marginX,
    south: bounds.south + marginY,
    north: bounds.north - marginY,
  }
}

describe('teselas que cubren un rectángulo', () => {
  it('el mundo entero ocupa 1, 4 y 16 teselas en los niveles 0, 1 y 2', () => {
    const world = { west: -180, south: -85, east: 180, north: 85 }

    expect([...tileCountsByZoom(world, { minZoom: 0, maxZoom: 2 })]).toEqual([
      [0, 1],
      [1, 4],
      [2, 16],
    ])
  })

  it('un punto ocupa una tesela por nivel de detalle: 15 entre los niveles 0 y 14', () => {
    const obelisco = {
      west: -58.3816,
      east: -58.3816,
      south: -34.6037,
      north: -34.6037,
    }

    expect(totalTileCount(obelisco, ALL_ZOOM_LEVELS)).toBe(15)
    expect([...tilesCovering(obelisco, ALL_ZOOM_LEVELS)].at(-1)).toEqual({
      z: 14,
      x: 5534,
      y: 9872,
    })
  })

  it('el rectángulo de una tesela de nivel 10 ocupa 1 tesela hasta el nivel 10 y se cuadruplica en cada nivel siguiente', () => {
    const insideOneTile = shrunk(tileBounds({ z: 10, x: 345, y: 612 }))
    const counts = tileCountsByZoom(insideOneTile, ALL_ZOOM_LEVELS)

    expect(counts.get(10)).toBe(1)
    expect(counts.get(11)).toBe(4)
    expect(counts.get(12)).toBe(16)
    expect(counts.get(13)).toBe(64)
    expect(counts.get(14)).toBe(256)
    expect(totalTileCount(insideOneTile, ALL_ZOOM_LEVELS)).toBe(
      11 + 4 + 16 + 64 + 256,
    )
  })

  it('enumera exactamente las teselas que cuenta, sin repetir ninguna', () => {
    const salta = { west: -65.6, south: -24.95, east: -65.3, north: -24.7 }
    const tiles = [...tilesCovering(salta, ALL_ZOOM_LEVELS)]

    expect(tiles).toHaveLength(totalTileCount(salta, ALL_ZOOM_LEVELS))
    expect(new Set(tiles.map(({ z, x, y }) => `${z}/${x}/${y}`)).size).toBe(
      tiles.length,
    )
  })

  it('acercar el mapa un nivel reduce la zona visible a la cuarta parte de las teselas de mayor detalle', () => {
    const province = { west: -66, south: -26, east: -64, north: -24 }

    const before = tileCountsByZoom(province, ALL_ZOOM_LEVELS).get(14)!
    const after = tileCountsByZoom(
      zoomedInBounds(province),
      ALL_ZOOM_LEVELS,
    ).get(14)!

    expect(after / before).toBeCloseTo(0.25, 1)
  })
})
