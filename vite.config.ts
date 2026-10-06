import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'
import { firstOpenOfflineNotice } from './vite-plugins/first-open-offline-notice.ts'

export default defineConfig({
  assetsInclude: ['**/*.pmtiles'],
  // El renderizador de mapas pesa más que el límite de aviso por defecto.
  build: { chunkSizeWarningLimit: 1500 },
  plugins: [
    react(),
    firstOpenOfflineNotice(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: [
        'favicon.ico',
        'icon.svg',
        'apple-touch-icon-180x180.png',
      ],
      manifest: {
        name: 'Riders',
        short_name: 'Riders',
        lang: 'es-AR',
        display: 'standalone',
        theme_color: '#14213d',
        background_color: '#14213d',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Solo la interfaz: las teselas del mapa las guarda la app en IndexedDB (design.md, D4 y D5).
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // El ingreso con Google pasa por /__/auth/, que sirve el hosting y no la app.
        navigateFallbackDenylist: [/^\/__\//],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // Las pruebas contra el emulador de Firebase corren aparte: `npm run test:emulator`.
    exclude: ['**/node_modules/**', 'src/**/*.emulator.test.ts'],
  },
})
