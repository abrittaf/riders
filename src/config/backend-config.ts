import { emulatorConfig } from '../backend/emulator-config.ts'
import type { BackendConfig } from '../backend/index.ts'

/**
 * Configuración pública del proyecto de Firebase: identifica al proyecto, no lo protege; la
 * seguridad la dan las reglas de la base de datos. Ver docs/backend.md.
 */
const productionConfig: BackendConfig = {
  firebase: {
    apiKey: 'AIzaSyCzxQTglVCtr4MJWO8zQAdmutg0THbYGsQ',
    // El dominio de la app y no `firebaseapp.com`: el ingreso por redirección lo necesita en Safari.
    authDomain: 'riders-65821.web.app',
    projectId: 'riders-65821',
    appId: '1:528755913716:web:e8d9300e4531a663cb3fa1',
    messagingSenderId: '528755913716',
    storageBucket: 'riders-65821.firebasestorage.app',
  },
}

/** Construcción para pruebas: proyecto de demostración contra el emulador local. */
const emulatedConfig: BackendConfig = {
  firebase: {
    apiKey: 'demo-api-key',
    authDomain: 'localhost',
    projectId: emulatorConfig.projectId,
    appId: '1:0:web:demo',
    messagingSenderId: '0',
    storageBucket: `${emulatorConfig.projectId}.appspot.com`,
  },
  emulator: emulatorConfig,
}

export const backendConfig: BackendConfig =
  import.meta.env.VITE_BACKEND_EMULATOR === 'true'
    ? emulatedConfig
    : productionConfig
