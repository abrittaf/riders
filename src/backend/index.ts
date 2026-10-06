/**
 * Interfaz pública de `backend`: el único módulo que conoce al proveedor de autenticación y de base
 * de datos. El resto de la app importa solo desde acá (salvo `create-backend.ts`, que la raíz de
 * composición de la app usa una vez al arrancar).
 */
export type { Backend, BackendConfig } from './backend.ts'
export type {
  RiderAccountService,
  RiderSession,
  SignedInRider,
} from './rider-account-service.ts'
