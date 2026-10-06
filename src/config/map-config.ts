import type { MapPlatformConfig } from '../map-platform/index.ts'

/**
 * Configuración del mapa. El proveedor de teselas, su servidor y el estilo se cambian acá,
 * sin tocar el resto de la app. Ver docs/proveedor-de-mapa.md, docs/proveedor-de-ruteo.md y docs/proveedor-de-busqueda.md.
 */
export const mapConfig: MapPlatformConfig = {
  tileProvider:
    import.meta.env.VITE_TILE_PROVIDER === 'pmtiles-sample'
      ? 'pmtiles-sample'
      : 'openfreemap',
  openFreeMap: {
    serverUrl: 'https://tiles.openfreemap.org',
    tileSetName: 'planet',
    styleName: 'liberty',
  },
  pmtilesSample: {
    archiveUrl: `${import.meta.env.BASE_URL}sample-tiles/cachi.pmtiles`,
  },
  routing: {
    serverUrl: 'https://valhalla1.openstreetmap.de',
    costing: 'motorcycle',
    minIntervalBetweenRequestsInMs: 1000,
  },
  placeSearch: {
    serverUrl: 'https://photon.komoot.io',
    maxResults: 10,
    minIntervalBetweenRequestsInMs: 1000,
  },
  initialView: {
    center: { latitude: -38.4, longitude: -63.6 },
    zoom: 3.5,
  },
  offlineRegions: {
    // Valor provisorio: se fija midiendo zonas típicas en celulares reales (design.md, Open Questions).
    maxTilesPerRegion: 12_000,
    downloadConcurrency: 4,
    lowStorageThresholdInBytes: 100 * 1024 * 1024,
  },
  exposeRenderDiagnostics: import.meta.env.VITE_MAP_DIAGNOSTICS === 'true',
}
