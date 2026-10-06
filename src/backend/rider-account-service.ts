import type { AvatarOptions } from '../avatar/avatar-options.ts'

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
    }

export interface RiderAccountService {
  /** Lleva al Rider a ingresar con Google; la app se recarga al volver. */
  signIn(): Promise<void>
  signOut(): Promise<void>
  /** Descarta el aviso de que el último ingreso no se completó. */
  dismissSignInFailure(): void
  currentSession(): RiderSession
  subscribe(listener: () => void): () => void
}
