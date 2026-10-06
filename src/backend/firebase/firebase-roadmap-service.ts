import type { Auth } from 'firebase/auth'
import {
  collection,
  deleteDoc,
  doc,
  type DocumentReference,
  type Firestore,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  where,
} from 'firebase/firestore'
import { fitDocumentSize } from '../../roadmap-planning/fit-document-size.ts'
import {
  duplicateDraftOf,
  type Roadmap,
  type RoadmapDraft,
} from '../../roadmap-planning/roadmap.ts'
import type { RoadmapService } from '../roadmap-service.ts'
import {
  roadmapDocumentOf,
  roadmapOf,
  ROADMAPS_COLLECTION,
  updatedAtOf,
} from './roadmap-document.ts'

/**
 * Roadmaps en la colección `roadmaps` de Firestore (design.md de roadmap-planning, D4), con la
 * persistencia local ya configurada para toda la base: los ya vistos se leen sin conexión.
 */
export class FirebaseRoadmapService implements RoadmapService {
  private readonly auth: Auth
  private readonly firestore: Firestore

  constructor(auth: Auth, firestore: Firestore) {
    this.auth = auth
    this.firestore = firestore
  }

  subscribeToOwn(listener: (roadmaps: Roadmap[]) => void): () => void {
    const ownRoadmaps = query(
      collection(this.firestore, ROADMAPS_COLLECTION),
      where('ownerId', '==', this.ownerId()),
    )
    // El orden se resuelve acá y no en la consulta, para no depender de un índice compuesto.
    return onSnapshot(ownRoadmaps, (snapshot) => {
      const roadmaps = snapshot.docs
        .map((document) => ({
          roadmap: roadmapOf(document.id, document.data()),
          updatedAt: updatedAtOf(document.data()),
        }))
        .filter(
          (entry): entry is { roadmap: Roadmap; updatedAt: number } =>
            entry.roadmap !== null,
        )
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map((entry) => entry.roadmap)
      listener(roadmaps)
    })
  }

  async read(id: string): Promise<Roadmap | null> {
    const snapshot = await getDoc(this.roadmapDoc(id))
    return snapshot.exists() ? roadmapOf(id, snapshot.data()) : null
  }

  async create(draft: RoadmapDraft): Promise<string> {
    const reference = doc(collection(this.firestore, ROADMAPS_COLLECTION))
    await this.write(reference, draft, true)
    return reference.id
  }

  update(id: string, draft: RoadmapDraft): Promise<void> {
    return this.write(this.roadmapDoc(id), draft, false)
  }

  delete(id: string): Promise<void> {
    return deleteDoc(this.roadmapDoc(id))
  }

  async duplicate(id: string, nameSuffix: string): Promise<string> {
    const original = await this.read(id)
    if (!original) throw new Error(`No existe el Roadmap ${id}`)
    return this.create(duplicateDraftOf(original, nameSuffix))
  }

  private write(
    reference: DocumentReference,
    draft: RoadmapDraft,
    isNew: boolean,
  ): Promise<void> {
    const document = roadmapDocumentOf(
      fitDocumentSize(draft),
      this.ownerId(),
      isNew,
    )
    // Un Roadmap se crea y se edita con conexión (proposal.md): se espera la confirmación del servidor.
    return setDoc(reference, document, { merge: !isNew })
  }

  private ownerId(): string {
    const user = this.auth.currentUser
    if (!user) throw new Error('No hay un Rider identificado')
    return user.uid
  }

  private roadmapDoc(id: string): DocumentReference {
    return doc(this.firestore, ROADMAPS_COLLECTION, id)
  }
}
