import {
  type Auth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithRedirect,
  signOut,
} from 'firebase/auth'
import type {
  RiderAccountService,
  RiderSession,
} from '../rider-account-service.ts'

export class FirebaseRiderAccountService implements RiderAccountService {
  private readonly auth: Auth
  private readonly listeners = new Set<() => void>()
  private session: RiderSession = { status: 'resolving' }

  constructor(auth: Auth) {
    this.auth = auth
    onAuthStateChanged(auth, (user) => {
      this.session = user
        ? {
            status: 'signed-in',
            rider: { id: user.uid, accountName: user.displayName },
          }
        : { status: 'signed-out' }
      this.listeners.forEach((listener) => listener())
    })
  }

  signIn(): Promise<void> {
    return signInWithRedirect(this.auth, new GoogleAuthProvider())
  }

  signOut(): Promise<void> {
    return signOut(this.auth)
  }

  currentSession(): RiderSession {
    return this.session
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}
