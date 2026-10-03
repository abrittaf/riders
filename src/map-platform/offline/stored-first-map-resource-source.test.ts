// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import {
  StoredFirstMapResourceSource,
  type StoredMapResources,
} from './stored-first-map-resource-source.ts'

const GLYPHS = 'https://mapas.example/fonts/Noto Sans Regular/0-255.pbf'

function inMemoryResources(): StoredMapResources & { urls(): string[] } {
  const stored = new Map<string, ArrayBuffer>()
  return {
    findResource: (url) => Promise.resolve(stored.get(url) ?? null),
    storeResource: (url, data) => {
      stored.set(url, data)
      return Promise.resolve()
    },
    urls: () => [...stored.keys()],
  }
}

function network(online = true) {
  return {
    getResource: vi.fn((url: string) =>
      online
        ? Promise.resolve(new TextEncoder().encode(url).buffer as ArrayBuffer)
        : Promise.reject(new TypeError('Failed to fetch')),
    ),
  }
}

describe('glifos e íconos del mapa', () => {
  it('la primera vez los pide a la red y los guarda; después los sirve desde el celular', async () => {
    const stored = inMemoryResources()
    const online = network()
    const resources = new StoredFirstMapResourceSource(stored, online)

    const first = await resources.getResource(GLYPHS)
    const second = await new StoredFirstMapResourceSource(
      stored,
      network(false),
    ).getResource(GLYPHS)

    expect(new Uint8Array(second)).toEqual(new Uint8Array(first))
    expect(online.getResource).toHaveBeenCalledOnce()
  })

  it('sin red y sin haberlos guardado, falla', async () => {
    const resources = new StoredFirstMapResourceSource(
      inMemoryResources(),
      network(false),
    )

    await expect(resources.getResource(GLYPHS)).rejects.toThrow()
  })

  it('al preparar una zona deja guardados los recursos que consigue y omite los que no', async () => {
    const stored = inMemoryResources()
    const flaky = {
      getResource: vi.fn((url: string) =>
        url.includes('256-511')
          ? Promise.reject(new Error('HTTP 404'))
          : Promise.resolve(new ArrayBuffer(8)),
      ),
    }
    const resources = new StoredFirstMapResourceSource(stored, flaky)

    await resources.ensureStored([
      GLYPHS,
      'https://mapas.example/fonts/Noto Sans Regular/256-511.pbf',
      'https://mapas.example/sprites/ofm.png',
    ])

    expect(stored.urls()).toEqual([
      GLYPHS,
      'https://mapas.example/sprites/ofm.png',
    ])
  })
})
