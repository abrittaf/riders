import { defineConfig } from 'vitest/config'
import { emulatorConfig } from './src/backend/emulator-config.ts'

/** Pruebas que necesitan el emulador de Firebase: corren con `npm run test:emulator`. */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.emulator.test.ts'],
    fileParallelism: false,
    env: {
      FIREBASE_AUTH_EMULATOR_HOST: `${emulatorConfig.host}:${emulatorConfig.authPort}`,
      FIRESTORE_EMULATOR_HOST: `${emulatorConfig.host}:${emulatorConfig.firestorePort}`,
    },
  },
})
