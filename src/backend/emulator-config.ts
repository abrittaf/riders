/**
 * Dónde escucha Firebase Emulator Suite (ver `emulators` en firebase.json). Lo comparten la app
 * construida para pruebas, Vitest y Playwright.
 */
export const emulatorConfig = {
  host: '127.0.0.1',
  authPort: 9099,
  firestorePort: 8080,
  /** Con prefijo `demo-` el emulador no toca ningún proyecto real. */
  projectId: 'demo-riders',
} as const

export type EmulatorConfig = typeof emulatorConfig
