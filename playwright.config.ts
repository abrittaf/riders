import { defineConfig, devices } from '@playwright/test'

const previewPort = 4173
const pmtilesPreviewPort = 4174
const pmtilesSpec = /proveedor-pmtiles\.spec\.ts/

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${previewPort}`,
    locale: 'es-AR',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'celular-chromium',
      testIgnore: pmtilesSpec,
      use: { ...devices['Pixel 7'] },
    },
    {
      // La misma app, construida con el proveedor PMTiles de ejemplo elegido por configuración.
      name: 'proveedor-pmtiles',
      testMatch: pmtilesSpec,
      use: {
        ...devices['Pixel 7'],
        baseURL: `http://localhost:${pmtilesPreviewPort}`,
      },
    },
  ],
  // Las pruebas corren contra la app construida: el service worker solo existe en el build.
  webServer: [
    {
      command: `VITE_MAP_DIAGNOSTICS=true npm run build && npm run preview -- --port ${previewPort} --strictPort`,
      url: `http://localhost:${previewPort}`,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `VITE_MAP_DIAGNOSTICS=true VITE_TILE_PROVIDER=pmtiles-sample npx vite build --outDir dist-pmtiles && npx vite preview --outDir dist-pmtiles --port ${pmtilesPreviewPort} --strictPort`,
      url: `http://localhost:${pmtilesPreviewPort}`,
      reuseExistingServer: !process.env.CI,
    },
  ],
})
