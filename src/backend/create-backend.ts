import { initializeApp } from 'firebase/app'
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  connectAuthEmulator,
  indexedDBLocalPersistence,
  initializeAuth,
} from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import type { Backend, BackendConfig } from './backend.ts'
import { FirebaseRiderAccountService } from './firebase/firebase-rider-account-service.ts'

export function createBackend(config: BackendConfig): Backend {
  const app = initializeApp(config.firebase)
  const auth = initializeAuth(app, {
    // La sesión se conserva entre aperturas hasta que el Rider la cierre (design.md, D3).
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    popupRedirectResolver: browserPopupRedirectResolver,
  })
  const firestore = getFirestore(app)
  if (config.emulator) {
    const { host, authPort, firestorePort } = config.emulator
    connectAuthEmulator(auth, `http://${host}:${authPort}`, {
      disableWarnings: true,
    })
    connectFirestoreEmulator(firestore, host, firestorePort)
  }
  return { riderAccount: new FirebaseRiderAccountService(auth) }
}
