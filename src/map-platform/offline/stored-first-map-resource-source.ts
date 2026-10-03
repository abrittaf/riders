import type { MapResourceSource } from '../map-resource-source.ts'

export interface StoredMapResources {
  findResource(url: string): Promise<ArrayBuffer | null>
  storeResource(url: string, data: ArrayBuffer): Promise<void>
}

/**
 * Glifos e íconos del estilo: se sirven desde el celular si ya están guardados; si no, se piden
 * a la red y se guardan, para que el mapa pueda dibujar nombres y lugares sin conexión.
 */
export class StoredFirstMapResourceSource implements MapResourceSource {
  private readonly stored: StoredMapResources
  private readonly network: MapResourceSource

  constructor(stored: StoredMapResources, network: MapResourceSource) {
    this.stored = stored
    this.network = network
  }

  async getResource(url: string, signal?: AbortSignal): Promise<ArrayBuffer> {
    const stored = await this.stored.findResource(url).catch(() => null)
    if (stored) return stored
    const data = await this.network.getResource(url, signal)
    await this.stored.storeResource(url, data).catch(() => {})
    return data
  }

  /** Deja guardados los recursos indicados; los que no se puedan obtener se omiten. */
  async ensureStored(urls: readonly string[]): Promise<void> {
    await Promise.all(
      urls.map((url) => this.getResource(url).catch(() => undefined)),
    )
  }
}
