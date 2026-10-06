import { doc, getDocFromServer } from 'firebase/firestore'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Point } from '../../point-lookup/point.ts'
import type { Roadmap, RoadmapDraft } from '../../roadmap-planning/roadmap.ts'
import {
  createEmulatedClients,
  deleteAllEmulatedAccounts,
  signInWithGoogleAccount,
} from './emulator-test-support.ts'
import { FirebaseRoadmapService } from './firebase-roadmap-service.ts'

const ana = { sub: 'google-ana', email: 'ana@example.com', name: 'Ana' }
const beto = { sub: 'google-beto', email: 'beto@example.com', name: 'Beto' }

function point(name: string, date: string | null = null): Point {
  return {
    name,
    position: { latitude: -24.7859, longitude: -65.4117 },
    source: 'known-place',
    type: 'fuel',
    date,
  }
}

const draft: RoadmapDraft = {
  name: 'Ida a Cachi',
  description: 'Por la Cuesta del Obispo',
  points: [point('Salta', '2026-11-20'), point('Cachi')],
  legs: [
    {
      distanceM: 167273,
      durationS: 18547,
      unpavedM: 15686,
      geometry: 'b|xgn@jzlw{B',
      surfaces: [{ fromIndex: 0, toIndex: 1, surface: 'compacted' }],
    },
  ],
}

/** Espera a que la lista propia cumpla una condición. */
function waitForOwn(
  service: FirebaseRoadmapService,
  condition: (roadmaps: Roadmap[]) => boolean,
): Promise<Roadmap[]> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('La lista no llegó al estado esperado')),
      10_000,
    )
    const stop = service.subscribeToOwn((roadmaps) => {
      if (!condition(roadmaps)) return
      clearTimeout(timeout)
      stop()
      resolve(roadmaps)
    })
  })
}

describe('FirebaseRoadmapService contra el emulador', () => {
  let clients: ReturnType<typeof createEmulatedClients>
  let service: FirebaseRoadmapService

  beforeEach(async () => {
    await deleteAllEmulatedAccounts()
    clients = createEmulatedClients()
    service = new FirebaseRoadmapService(clients.auth, clients.firestore)
    await signInWithGoogleAccount(clients.auth, ana)
  })

  afterEach(() => clients.dispose())

  it('crea un Roadmap a nombre del Rider identificado, con totales y fechas del servidor, y aparece en su lista', async () => {
    const id = await service.create(draft)

    const [stored] = await waitForOwn(service, (list) => list.length === 1)
    expect(stored).toMatchObject({
      id,
      ownerId: clients.auth.currentUser!.uid,
      name: 'Ida a Cachi',
      status: 'planning',
      totalDistanceM: 167273,
      totalDurationS: 18547,
    })
    expect(stored!.points.map((p) => [p.name, p.type, p.date])).toEqual([
      ['Salta', 'fuel', '2026-11-20'],
      ['Cachi', 'fuel', null],
    ])
    const document = await getDocFromServer(
      doc(clients.firestore, 'roadmaps', id),
    )
    expect(document.get('createdAt')).toBeTruthy()
    expect(document.get('updatedAt')).toBeTruthy()
  })

  it('actualiza y borra un Roadmap propio, y la lista lo refleja', async () => {
    const id = await service.create(draft)
    await waitForOwn(service, (list) => list.length === 1)

    await service.update(id, { ...draft, name: 'Vuelta de Cachi' })
    const [updated] = await waitForOwn(
      service,
      (list) => list[0]?.name === 'Vuelta de Cachi',
    )
    expect(updated!.points).toHaveLength(2)

    await service.delete(id)
    await waitForOwn(service, (list) => list.length === 0)
  })

  it('duplica un Roadmap como uno nuevo sin fechas, con nombre distinguible, sin tocar el original', async () => {
    const originalId = await service.create(draft)
    await waitForOwn(service, (list) => list.length === 1)

    const copyId = await service.duplicate(originalId, '(copia)')

    const roadmaps = await waitForOwn(service, (list) => list.length === 2)
    const copy = roadmaps.find((r) => r.id === copyId)!
    const original = roadmaps.find((r) => r.id === originalId)!
    expect(copyId).not.toBe(originalId)
    expect(copy.name).toBe('Ida a Cachi (copia)')
    expect(copy.points.map((p) => p.date)).toEqual([null, null])
    expect(copy.legs).toEqual(original.legs)
    expect(original.points[0]!.date).toBe('2026-11-20')
  })

  it('la lista de un Rider no incluye los Roadmaps de otro', async () => {
    await service.create(draft)
    await waitForOwn(service, (list) => list.length === 1)
    const others = createEmulatedClients()
    await signInWithGoogleAccount(others.auth, beto)
    const otherService = new FirebaseRoadmapService(
      others.auth,
      others.firestore,
    )

    const own = await new Promise<Roadmap[]>((resolve) => {
      const stop = otherService.subscribeToOwn((roadmaps) => {
        stop()
        resolve(roadmaps)
      })
    })

    expect(own).toEqual([])
    await others.dispose()
  })
})
