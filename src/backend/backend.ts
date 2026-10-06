import type { EmulatorConfig } from './emulator-config.ts'
import type { RiderAccountService } from './rider-account-service.ts'
import type { RoadmapService } from './roadmap-service.ts'

export interface Backend {
  riderAccount: RiderAccountService
  roadmaps: RoadmapService
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
  /** Si está presente, la app habla con el emulador local en lugar del proyecto real. */
  emulator?: EmulatorConfig
}
