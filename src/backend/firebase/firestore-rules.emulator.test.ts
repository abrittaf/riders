import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import rules from '../../../firestore.rules?raw'
import { emulatorConfig } from '../emulator-config.ts'

const OWNER = 'rider-ana'
const OTHER = 'rider-beto'

const validAvatar = {
  helmetType: 'full-face',
  helmetColor: 'white',
  neckwear: 'bandana',
  neckwearColor: 'blue',
  glasses: false,
  beard: true,
}

function newRider(overrides: Record<string, unknown> = {}) {
  return {
    displayName: 'Ana',
    avatar: validAvatar,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  }
}

const storedPoint = {
  name: 'Salta',
  latitude: -24.7859,
  longitude: -65.4117,
  source: 'known-place',
  type: null,
  date: null,
}

const storedLeg = {
  distanceM: 167273,
  durationS: 18547,
  unpavedM: 15686,
  geometry: 'abc',
  surfaces: [{ fromIndex: 0, toIndex: 10, surface: 'paved' }],
}

function newRoadmap(overrides: Record<string, unknown> = {}) {
  return {
    ownerId: OWNER,
    name: 'Ida a Cachi',
    description: '',
    status: 'planning',
    points: [storedPoint, { ...storedPoint, name: 'Cachi' }],
    legs: [storedLeg],
    totalDistanceM: 167273,
    totalDurationS: 18547,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  }
}

function newVehicle(overrides: Record<string, unknown> = {}) {
  return {
    model: 'Honda XR 250',
    rangeKm: 300,
    updatedAt: serverTimestamp(),
    ...overrides,
  }
}

describe('Reglas de Firestore', () => {
  let env: RulesTestEnvironment

  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId: emulatorConfig.projectId,
      firestore: {
        rules,
        host: emulatorConfig.host,
        port: emulatorConfig.firestorePort,
      },
    })
  })

  beforeEach(() => env.clearFirestore())
  afterAll(() => env.cleanup())

  const riderDoc = (uid: string | null, riderId = OWNER) =>
    doc(context(uid), 'riders', riderId)
  const vehicleDoc = (uid: string | null, riderId = OWNER) =>
    doc(context(uid), 'riders', riderId, 'private', 'vehicle')
  const context = (uid: string | null) =>
    uid
      ? env.authenticatedContext(uid).firestore()
      : env.unauthenticatedContext().firestore()

  async function givenOwnerProfile() {
    await env.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), 'riders', OWNER), newRider())
      await setDoc(
        doc(admin.firestore(), 'riders', OWNER, 'private', 'vehicle'),
        newVehicle(),
      )
    })
  }

  describe('perfil del Rider', () => {
    it('el dueño crea su perfil con datos válidos', async () => {
      await assertSucceeds(setDoc(riderDoc(OWNER), newRider()))
    })

    it('otro Rider no puede crear ni modificar un perfil ajeno', async () => {
      await givenOwnerProfile()
      await assertFails(setDoc(riderDoc(OTHER), newRider()))
      await assertFails(
        updateDoc(riderDoc(OTHER), { updatedAt: serverTimestamp() }),
      )
    })

    it('sin sesión no se lee ningún perfil', async () => {
      await givenOwnerProfile()
      await assertFails(getDoc(riderDoc(null)))
    })

    it('cualquier Rider identificado lee el nombre y el avatar de otro', async () => {
      await givenOwnerProfile()
      await assertSucceeds(getDoc(riderDoc(OTHER)))
    })

    it('rechaza nombres fuera de 2 a 24 caracteres', async () => {
      await assertFails(setDoc(riderDoc(OWNER), newRider({ displayName: 'A' })))
      await assertFails(
        setDoc(riderDoc(OWNER), newRider({ displayName: 'a'.repeat(25) })),
      )
      await assertSucceeds(
        setDoc(riderDoc(OWNER), newRider({ displayName: 'a'.repeat(24) })),
      )
    })

    it('rechaza avatares con opciones fuera del sistema de avatares', async () => {
      await assertFails(
        setDoc(
          riderDoc(OWNER),
          newRider({ avatar: { ...validAvatar, helmetColor: 'pink' } }),
        ),
      )
      await assertFails(
        setDoc(
          riderDoc(OWNER),
          newRider({ avatar: { ...validAvatar, hat: true } }),
        ),
      )
    })

    it('rechaza campos que no son del perfil, como el correo electrónico', async () => {
      await assertFails(
        setDoc(riderDoc(OWNER), newRider({ email: 'ana@example.com' })),
      )
    })

    it('el dueño actualiza su perfil sin alterar la fecha de creación', async () => {
      await givenOwnerProfile()
      await assertSucceeds(
        updateDoc(riderDoc(OWNER), {
          displayName: 'Anita',
          updatedAt: serverTimestamp(),
        }),
      )
      await assertFails(
        updateDoc(riderDoc(OWNER), {
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
      )
    })

    it('solo el dueño borra su perfil', async () => {
      await givenOwnerProfile()
      await assertFails(deleteDoc(riderDoc(OTHER)))
      await assertSucceeds(deleteDoc(riderDoc(OWNER)))
    })
  })

  describe('Vehicle privado', () => {
    it('el dueño guarda y lee su Vehicle', async () => {
      await assertSucceeds(setDoc(vehicleDoc(OWNER), newVehicle()))
      await assertSucceeds(getDoc(vehicleDoc(OWNER)))
    })

    it('otro Rider identificado no lee ni escribe el Vehicle ajeno', async () => {
      await givenOwnerProfile()
      await assertFails(getDoc(vehicleDoc(OTHER)))
      await assertFails(setDoc(vehicleDoc(OTHER), newVehicle()))
    })

    it('rechaza marca/modelo fuera de 2 a 40 caracteres', async () => {
      await assertFails(setDoc(vehicleDoc(OWNER), newVehicle({ model: 'X' })))
      await assertFails(
        setDoc(vehicleDoc(OWNER), newVehicle({ model: 'x'.repeat(41) })),
      )
    })

    it('rechaza autonomías que no son enteros entre 50 y 1000', async () => {
      await assertFails(setDoc(vehicleDoc(OWNER), newVehicle({ rangeKm: 49 })))
      await assertFails(
        setDoc(vehicleDoc(OWNER), newVehicle({ rangeKm: 1001 })),
      )
      await assertFails(
        setDoc(vehicleDoc(OWNER), newVehicle({ rangeKm: 200.5 })),
      )
      await assertFails(
        setDoc(vehicleDoc(OWNER), newVehicle({ rangeKm: '200' })),
      )
      await assertSucceeds(
        setDoc(vehicleDoc(OWNER), newVehicle({ rangeKm: 1000 })),
      )
    })
  })

  describe('Roadmaps en planificación', () => {
    const roadmapDoc = (uid: string | null, id = 'r1') =>
      doc(context(uid), 'roadmaps', id)

    async function givenOwnerRoadmap() {
      await env.withSecurityRulesDisabled(async (admin) => {
        await setDoc(doc(admin.firestore(), 'roadmaps', 'r1'), newRoadmap())
      })
    }

    it('el autor crea un Roadmap válido a su nombre', async () => {
      await assertSucceeds(setDoc(roadmapDoc(OWNER), newRoadmap()))
    })

    it('nadie crea un Roadmap a nombre de otro Rider', async () => {
      await assertFails(setDoc(roadmapDoc(OTHER), newRoadmap()))
      await assertFails(setDoc(roadmapDoc(null), newRoadmap()))
    })

    it('otro Rider identificado no lee, ni modifica, ni borra un Roadmap ajeno', async () => {
      await givenOwnerRoadmap()
      await assertFails(getDoc(roadmapDoc(OTHER)))
      await assertFails(
        updateDoc(roadmapDoc(OTHER), {
          name: 'Robado',
          updatedAt: serverTimestamp(),
        }),
      )
      await assertFails(deleteDoc(roadmapDoc(OTHER)))
    })

    it('sin sesión no se lee ningún Roadmap', async () => {
      await givenOwnerRoadmap()
      await assertFails(getDoc(roadmapDoc(null)))
    })

    it('el autor lee, actualiza y borra su Roadmap', async () => {
      await givenOwnerRoadmap()
      await assertSucceeds(getDoc(roadmapDoc(OWNER)))
      const stored = (await getDoc(roadmapDoc(OWNER))).data()!
      await assertSucceeds(
        setDoc(
          roadmapDoc(OWNER),
          newRoadmap({ name: 'Vuelta', createdAt: stored['createdAt'] }),
        ),
      )
      await assertSucceeds(deleteDoc(roadmapDoc(OWNER)))
    })

    it('rechaza un Roadmap con un solo Point', async () => {
      await assertFails(
        setDoc(
          roadmapDoc(OWNER),
          newRoadmap({ points: [storedPoint], legs: [] }),
        ),
      )
    })

    it('rechaza tramos que no se corresponden con los Points', async () => {
      await assertFails(setDoc(roadmapDoc(OWNER), newRoadmap({ legs: [] })))
      await assertFails(
        setDoc(roadmapDoc(OWNER), newRoadmap({ legs: [storedLeg, storedLeg] })),
      )
    })

    it('rechaza nombres fuera de 2 a 60 caracteres y estados que no son planificación', async () => {
      await assertFails(setDoc(roadmapDoc(OWNER), newRoadmap({ name: 'A' })))
      await assertFails(
        setDoc(roadmapDoc(OWNER), newRoadmap({ name: 'a'.repeat(61) })),
      )
      await assertFails(
        setDoc(roadmapDoc(OWNER), newRoadmap({ status: 'convened' })),
      )
    })

    it('el autor no puede cambiar el dueño ni la fecha de creación al actualizar', async () => {
      await givenOwnerRoadmap()
      const stored = (await getDoc(roadmapDoc(OWNER))).data()!
      await assertFails(
        setDoc(
          roadmapDoc(OWNER),
          newRoadmap({ ownerId: OTHER, createdAt: stored['createdAt'] }),
        ),
      )
      await assertFails(setDoc(roadmapDoc(OWNER), newRoadmap()))
    })
  })
})
