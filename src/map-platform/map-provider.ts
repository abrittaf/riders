import type { TileSource } from './tile-source.ts'

export interface MapAttribution {
  name: string
  url: string
  /** Clave de traducción que describe qué aporta la fuente y bajo qué licencia. */
  descriptionKey: string
}

/** Estilo de mapa en el formato de MapLibre; fuera de `map-platform` nadie lo interpreta. */
export type MapStyle = Record<string, unknown>

/**
 * Lo que un proveedor de mapa aporta al módulo: de dónde salen las teselas en red,
 * con qué estilo se dibujan y a quién hay que atribuirlas.
 */
export interface MapProvider {
  /** Teselas pedidas a la red para mostrarlas en el mapa. */
  readonly networkTileSource: TileSource
  /** Teselas pedidas a la red para guardarlas en una zona descargada. */
  readonly downloadTileSource: TileSource
  /** Mayor nivel de detalle para el que el proveedor tiene teselas. */
  readonly maxZoom: number
  readonly attributions: readonly MapAttribution[]
  buildStyle(language: string): MapStyle
  /** Recursos del estilo que una zona descargada necesita para dibujarse sin conexión. */
  offlineResourceUrls(): string[]
}
