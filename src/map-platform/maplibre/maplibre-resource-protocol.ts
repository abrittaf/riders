import { addProtocol, type AddProtocolAction } from 'maplibre-gl'
import type { MapResourceSource } from '../map-resource-source.ts'
import {
  type TileCoordinates,
  type TileSource,
  TileUnavailableError,
} from '../tile-source.ts'
import { MAP_PROTOCOL, parseMapRendererUrl } from './map-renderer-urls.ts'

export type TileOutcome = 'loaded' | 'unavailable'

type TileOutcomeListener = (
  coordinates: TileCoordinates,
  outcome: TileOutcome,
) => void

/** Conecta MapLibre con la app: cada tesela y cada recurso que el renderizador pide pasa por acá. */
export class MapLibreResourceProtocol {
  private readonly tileSource: TileSource
  private readonly resourceSource: MapResourceSource
  private readonly listeners = new Set<TileOutcomeListener>()

  constructor(tileSource: TileSource, resourceSource: MapResourceSource) {
    this.tileSource = tileSource
    this.resourceSource = resourceSource
  }

  register(): void {
    addProtocol(MAP_PROTOCOL, this.handle)
  }

  subscribeToTileOutcomes(listener: TileOutcomeListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private readonly handle: AddProtocolAction = async (
    request,
    abortController,
  ) => {
    const parsed = parseMapRendererUrl(request.url)
    if (parsed.kind === 'tile') {
      return { data: await this.loadTile(parsed.coordinates, abortController) }
    }
    const data = await this.resourceSource.getResource(
      parsed.url,
      abortController.signal,
    )
    return request.type === 'json'
      ? { data: JSON.parse(new TextDecoder().decode(data)) as object }
      : { data }
  }

  private async loadTile(
    coordinates: TileCoordinates,
    abortController: AbortController,
  ): Promise<ArrayBuffer> {
    try {
      const tile = await this.tileSource.getTile(
        coordinates,
        abortController.signal,
      )
      this.publish(coordinates, 'loaded')
      return tile.data
    } catch (error) {
      if (error instanceof TileUnavailableError) {
        this.publish(coordinates, 'unavailable')
      }
      throw error
    }
  }

  private publish(coordinates: TileCoordinates, outcome: TileOutcome) {
    this.listeners.forEach((listener) => listener(coordinates, outcome))
  }
}
