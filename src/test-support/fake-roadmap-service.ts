import type { RoadmapService } from '../backend/index.ts'
import {
  duplicateDraftOf,
  type Roadmap,
  type RoadmapDraft,
  totalsOf,
} from '../roadmap-planning/roadmap.ts'

/** Roadmaps en memoria del Rider `sample-rider`, con la lista reactiva como la real. */
export class FakeRoadmapService implements RoadmapService {
  readonly stored = new Map<string, Roadmap>()
  private readonly listeners = new Set<(roadmaps: Roadmap[]) => void>()
  private nextId = 1
  available = true

  subscribeToOwn(listener: (roadmaps: Roadmap[]) => void): () => void {
    this.listeners.add(listener)
    listener(this.own())
    return () => this.listeners.delete(listener)
  }

  read(id: string): Promise<Roadmap | null> {
    return Promise.resolve(this.stored.get(id) ?? null)
  }

  create(draft: RoadmapDraft): Promise<string> {
    if (!this.available) return Promise.reject(new Error('sin servicio'))
    const id = `roadmap-${this.nextId++}`
    this.put(id, draft)
    return Promise.resolve(id)
  }

  update(id: string, draft: RoadmapDraft): Promise<void> {
    if (!this.available) return Promise.reject(new Error('sin servicio'))
    this.put(id, draft)
    return Promise.resolve()
  }

  delete(id: string): Promise<void> {
    this.stored.delete(id)
    this.publish()
    return Promise.resolve()
  }

  async duplicate(id: string, nameSuffix: string): Promise<string> {
    const original = this.stored.get(id)
    if (!original) throw new Error(`No existe ${id}`)
    return this.create(duplicateDraftOf(original, nameSuffix))
  }

  /** Deja un Roadmap guardado, como si el Rider lo hubiera creado antes. */
  given(id: string, draft: RoadmapDraft) {
    this.put(id, draft)
  }

  private put(id: string, draft: RoadmapDraft) {
    this.stored.set(id, {
      id,
      ownerId: 'sample-rider',
      status: 'planning',
      ...structuredClone(draft),
      ...totalsOf(draft.legs),
    })
    this.publish()
  }

  private own(): Roadmap[] {
    return [...this.stored.values()].reverse()
  }

  private publish() {
    this.listeners.forEach((listener) => listener(this.own()))
  }
}
