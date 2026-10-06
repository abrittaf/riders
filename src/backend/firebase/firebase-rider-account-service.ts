import {
  type Auth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth'
import { doc, type Firestore, onSnapshot } from 'firebase/firestore'
import { isAvatarOptions } from '../../avatar/avatar-options.ts'
import type {
  RiderAccountService,
  RiderProfile,
  RiderSession,
} from '../rider-account-service.ts'

/** Marca que hay un ingreso en curso: se escribe al ir a Google y se borra al volver. */
const PENDING_SIGN_IN_KEY = 'riders.signInPending'

export class FirebaseRiderAccountService implements RiderAccountService {
  private readonly auth: Auth
  private readonly firestore: Firestore
  private readonly storage: Storage
  private readonly listeners = new Set<() => void>()
  private session: RiderSession = { status: 'resolving' }
  private signInFailed = false
  private stopWatchingProfile: (() => void) | null = null

  constructor(auth: Auth, firestore: Firestore, storage: Storage) {
    this.auth = auth
    this.firestore = firestore
    this.storage = storage
    onAuthStateChanged(auth, (user) => this.onUserChanged(user))
    this.settlePendingSignIn()
  }

  async signIn(): Promise<void> {
    this.storage.setItem(PENDING_SIGN_IN_KEY, 'true')
    await signInWithRedirect(this.auth, new GoogleAuthProvider())
  }

  signOut(): Promise<void> {
    return signOut(this.auth)
  }

  dismissSignInFailure(): void {
    this.signInFailed = false
    if (this.session.status === 'signed-out') {
      this.publish({ status: 'signed-out', signInFailed: false })
    }
  }

  currentSession(): RiderSession {
    return this.session
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Al volver de Google, un ingreso cancelado o fallido llega como rechazo de la redirección. Solo
   * cuenta si este dispositivo había iniciado un ingreso: sin red, la consulta también rechaza.
   */
  private settlePendingSignIn() {
    const wasPending = this.storage.getItem(PENDING_SIGN_IN_KEY) !== null
    getRedirectResult(this.auth)
      .catch(() => {
        if (!wasPending) return
        this.signInFailed = true
        if (this.session.status === 'signed-out') {
          this.publish({ status: 'signed-out', signInFailed: true })
        }
      })
      .finally(() => this.storage.removeItem(PENDING_SIGN_IN_KEY))
  }

  private onUserChanged(user: User | null) {
    this.stopWatchingProfile?.()
    this.stopWatchingProfile = null
    if (!user) {
      this.publish({ status: 'signed-out', signInFailed: this.signInFailed })
      return
    }
    const rider = { id: user.uid, accountName: user.displayName }
    // La sesión se publica recién con el perfil leído, para no mostrarla incompleta por un instante.
    this.stopWatchingProfile = onSnapshot(
      doc(this.firestore, 'riders', user.uid),
      (snapshot) => {
        this.signInFailed = false
        this.publish({
          status: 'signed-in',
          rider,
          profile: toRiderProfile(snapshot.data()),
        })
      },
    )
  }

  private publish(session: RiderSession) {
    this.session = session
    this.listeners.forEach((listener) => listener())
  }
}

function toRiderProfile(data: unknown): RiderProfile | null {
  if (typeof data !== 'object' || data === null) return null
  const { displayName, avatar } = data as Record<string, unknown>
  if (typeof displayName !== 'string' || !isAvatarOptions(avatar)) return null
  return { displayName, avatar }
}
