import type { BackendConfig } from '../backend/index.ts'

/**
 * Configuración pública del proyecto de Firebase: identifica al proyecto, no lo protege; la
 * seguridad la dan las reglas de la base de datos. Ver docs/backend.md.
 */
export const backendConfig: BackendConfig = {
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
