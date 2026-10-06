import type { Roadmap, RoadmapDraft } from '../roadmap-planning/roadmap.ts'

/**
 * Los Roadmaps del Rider identificado (design.md de roadmap-planning, D4). Todas las operaciones
 * funcionan con la persistencia local: sin conexión se leen los ya vistos y las escrituras esperan.
 */
export interface RoadmapService {
  /** Los Roadmaps propios, del más reciente al más antiguo; avisa con cada cambio. */
  subscribeToOwn(listener: (roadmaps: Roadmap[]) => void): () => void
  read(id: string): Promise<Roadmap | null>
  /** @returns el identificador del Roadmap creado */
  create(draft: RoadmapDraft): Promise<string>
  update(id: string, draft: RoadmapDraft): Promise<void>
  delete(id: string): Promise<void>
  /** Un Roadmap nuevo a partir de otro, sin fechas y en planificación (spec «Duplicación»). */
  duplicate(id: string, nameSuffix: string): Promise<string>
}
