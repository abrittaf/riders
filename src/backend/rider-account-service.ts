import type { AvatarOptions } from '../avatar/avatar-options.ts'
import type { Vehicle } from '../rider-vehicles/vehicle.ts'

/** El Rider identificado, tal como lo conoce la cuenta con la que ingresó. */
export interface SignedInRider {
  id: string
  /** Nombre de la cuenta de Google; sirve solo para proponer el nombre visible. */
  accountName: string | null
}

/** Lo que otros Riders ven de un Rider. */
export interface RiderProfile {
  displayName: string
  avatar: AvatarOptions
}

export type RiderSession =
  | { status: 'resolving' }
  | { status: 'signed-out'; signInFailed: boolean }
  | {
      status: 'signed-in'
      rider: SignedInRider
      /** `null` mientras el Rider no completó su perfil. */
      profile: RiderProfile | null
      /** La moto del Rider; solo él la ve. */
      vehicle: Vehicle | null
      /** Hay cambios hechos sin conexión que todavía no llegaron al servidor. */
      pendingSync: boolean
    }

export type DeleteAccountResult =
  | { status: 'deleted' }
  /** El ingreso no es reciente: hay que volver a confirmar la identidad con Google. */
  | { status: 'requires-recent-sign-in' }

export interface RiderAccountService {
  /** Lleva al Rider a ingresar con Google; la app se recarga al volver. */
  signIn(): Promise<void>
  signOut(): Promise<void>
  /** Descarta el aviso de que el último ingreso no se completó. */
  dismissSignInFailure(): void
  currentSession(): RiderSession
  subscribe(listener: () => void): () => void
  /** Guarda perfil y moto del Rider identificado; crea el perfil si es el primero. */
  saveProfile(profile: RiderProfile, vehicle: Vehicle): Promise<void>
  /** Nombre visible y avatar de otro Rider; `null` si no existe. */
  readPublicProfile(riderId: string): Promise<RiderProfile | null>
  /** Borra perfil, moto y el vínculo con la cuenta de Google; requiere conexión. */
  deleteAccount(): Promise<DeleteAccountResult>
  /** Vuelve a confirmar la identidad con Google; la app se recarga al volver y retoma la eliminación. */
  reconfirmIdentityAndDeleteAccount(): Promise<void>
}
