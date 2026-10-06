import type { RiderAccountService } from './rider-account-service.ts'

export interface Backend {
  riderAccount: RiderAccountService
}

/** Configuración pública del proyecto de Firebase: no es un secreto (design.md, D7). */
export interface BackendConfig {
  firebase: {
    apiKey: string
    authDomain: string
    projectId: string
    appId: string
    messagingSenderId: string
    storageBucket: string
  }
}
