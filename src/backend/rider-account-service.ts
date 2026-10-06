/** El Rider identificado, tal como lo conoce la cuenta con la que ingresó. */
export interface SignedInRider {
  id: string
  /** Nombre de la cuenta de Google; sirve solo para proponer el nombre visible. */
  accountName: string | null
}

export type RiderSession =
  | { status: 'resolving' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; rider: SignedInRider }

export interface RiderAccountService {
  /** Lleva al Rider a ingresar con Google; la app se recarga al volver. */
  signIn(): Promise<void>
  signOut(): Promise<void>
  currentSession(): RiderSession
  subscribe(listener: () => void): () => void
}
