import { vi } from 'vitest'
import {
  jsonResponse,
  meetingJson,
  mockApi,
  pagedHandler,
  slotJson,
  speakerFullMe,
  type MeetingJson,
  type SlotJson,
} from './helpers'

/** « Maintenant » des tests : mardi 24 novembre 2026, 8h00 (fuseau des tests : Africa/Lagos, UTC+1). */
export const NOW = new Date('2026-11-24T08:00:00+01:00')

export function freezeNow() {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
}

export const FREE_SLOT = slotJson()
export const REQUESTED_SLOT = slotJson({
  id: 'c0000000-0000-4000-8000-000000000002',
  startAt: '2026-11-27T14:00:00+01:00',
  endAt: '2026-11-27T15:00:00+01:00',
  formats: 'IN_PERSON',
})
export const CONFIRMED_SLOT = slotJson({
  id: 'c0000000-0000-4000-8000-000000000003',
  startAt: '2026-11-30T09:00:00+01:00',
  endAt: '2026-11-30T10:00:00+01:00',
  status: 'CONFIRMED',
})

/** Deux demandes en attente sur le même créneau ; la première vient d'une école de la même zone. */
export const REQUEST_A = meetingJson({
  // Ville et pays sans accents ni majuscules : la zone est comparée sans en tenir compte.
  school: { name: 'Lycée des Tisserands', city: 'dakar', country: 'senegal' },
  message: 'Nos élèves rêvent de comprendre comment fonctionne internet.',
})
export const REQUEST_B = meetingJson({
  id: 'd0000000-0000-4000-8000-000000000002',
  school: { name: 'Collège Les Baobabs', city: 'Thiès', country: 'Sénégal' },
  schoolClass: { title: '3e B', studentCount: null },
  createdAt: '2026-11-23T10:00:00+01:00',
})
export const CONFIRMED_MEETING = meetingJson({
  id: 'd0000000-0000-4000-8000-000000000003',
  status: 'CONFIRMED',
  myDecision: 'VALIDATED',
  school: { name: 'Lycée Blaise Diagne', city: 'Dakar', country: 'Sénégal' },
  schoolClass: { title: 'Première L', studentCount: 28 },
  slot: { id: CONFIRMED_SLOT.id, startAt: CONFIRMED_SLOT.startAt, endAt: CONFIRMED_SLOT.endAt },
  place: 'Salle informatique',
})
export const COMPLETED_MEETING = meetingJson({
  id: 'd0000000-0000-4000-8000-000000000004',
  status: 'COMPLETED',
  myDecision: 'VALIDATED',
  school: { name: 'Centre de formation Saint-Louis', city: 'Saint-Louis', country: 'Sénégal' },
  slot: { id: 'c0000000-0000-4000-8000-000000000004', startAt: '2026-11-10T09:00:00+01:00', endAt: '2026-11-10T10:00:00+01:00' },
})
export const FOUNDATION_REFUSED = meetingJson({
  id: 'd0000000-0000-4000-8000-000000000005',
  status: 'REFUSED',
  myDecision: 'VALIDATED',
  closedBy: 'FOUNDATION',
  reason: 'La classe a déjà une rencontre ce mois-ci.',
  school: { name: 'Lycée de Thiès', city: 'Thiès', country: 'Sénégal' },
  slot: { id: 'c0000000-0000-4000-8000-000000000005', startAt: '2026-11-12T15:00:00+01:00', endAt: '2026-11-12T16:00:00+01:00' },
})
export const SYSTEM_REFUSED = meetingJson({
  id: 'd0000000-0000-4000-8000-000000000006',
  status: 'REFUSED',
  myDecision: 'VALIDATED',
  closedBy: 'SYSTEM',
  reason: 'Ce créneau a été attribué à une autre demande.',
  school: { name: 'Collège de Rufisque', city: 'Rufisque', country: 'Sénégal' },
  slot: { id: CONFIRMED_SLOT.id, startAt: CONFIRMED_SLOT.startAt, endAt: CONFIRMED_SLOT.endAt },
})

export function defaultData() {
  return {
    slots: [FREE_SLOT, REQUESTED_SLOT, CONFIRMED_SLOT],
    meetings: [REQUEST_A, REQUEST_B, CONFIRMED_MEETING, COMPLETED_MEETING, FOUNDATION_REFUSED, SYSTEM_REFUSED],
  }
}

export interface SpeakerStore {
  slots: SlotJson[]
  meetings: MeetingJson[]
}

export function setupSpeaker(
  initial: SpeakerStore = defaultData(),
  extra: Parameters<typeof mockApi>[0] = {},
  { maxSize = 100 }: { maxSize?: number } = {},
) {
  const store: SpeakerStore = { slots: [...initial.slots], meetings: [...initial.meetings] }
  const fetchMock = mockApi({
    'GET /api/me': () => jsonResponse(200, speakerFullMe),
    'GET /api/speaker/slots': pagedHandler(() => store.slots, maxSize),
    'GET /api/speaker/meetings': pagedHandler(() => store.meetings, maxSize),
    ...extra,
  })
  const calls = (method: string, path: string) =>
    fetchMock.mock.calls.filter(([request]) => request.method === method && new URL(request.url).pathname === path)
  return { store, fetchMock, calls }
}

export function updateMeeting(store: SpeakerStore, id: string, changes: Partial<MeetingJson>) {
  store.meetings = store.meetings.map((meeting) => (meeting.id === id ? { ...meeting, ...changes } : meeting))
}
