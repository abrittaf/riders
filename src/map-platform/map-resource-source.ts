/** Recursos del estilo del mapa que no son teselas: tipografías (glifos) e íconos (sprites). */
export interface MapResourceSource {
  getResource(url: string, signal?: AbortSignal): Promise<ArrayBuffer>
}

export class NetworkMapResourceSource implements MapResourceSource {
  private readonly fetchResource: typeof fetch

  constructor(fetchResource: typeof fetch = (...args) => fetch(...args)) {
    this.fetchResource = fetchResource
  }

  async getResource(url: string, signal?: AbortSignal): Promise<ArrayBuffer> {
    const response = await this.fetchResource(url, { signal })
    if (!response.ok) {
      throw new Error(`No se pudo obtener ${url}: HTTP ${response.status}`)
    }
    return response.arrayBuffer()
  }
}
