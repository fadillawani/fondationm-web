import { jsonResponse, makeMe, mockApi, pagedHandler } from './helpers'

type Handler = Parameters<typeof mockApi>[0][string]

export const STUDENT_CLASS_ID = 'c1100000-0000-4000-8000-000000000001'

export const studentMe = makeMe({
  id: '7f1c2a9e-0000-4000-8000-0000000000e1',
  email: 'khadija.ba.sor@eleve.fondationm.sn',
  role: 'STUDENT',
  profile: { type: 'STUDENT', firstName: 'Khadija', lastName: 'Ba', classId: STUDENT_CLASS_ID, classTitle: 'Terminale S2' },
})

/** Élève sans classe (`classId` et `classTitle` absents). */
export const studentWithoutClassMe = makeMe({
  ...studentMe,
  profile: { type: 'STUDENT', firstName: 'Khadija', lastName: 'Ba', classId: null as unknown as string, classTitle: null as unknown as string },
})

/** Rencontre telle que renvoyée par `GET /api/student/meetings` (contrat StudentMeetingResponse). */
export function studentMeetingJson(overrides: Record<string, unknown> & { id: string; startAt: string }) {
  return {
    status: 'CONFIRMED',
    endAt: null,
    speaker: { fullName: 'Awa Sarr', city: 'Dakar', country: 'Sénégal', skills: ['Python', 'Statistiques'], jobTitle: 'Ingénieure data', organization: null, motivation: 'Texte écrit pour la Fondation.' },
    format: 'IN_PERSON',
    place: 'Salle 4',
    ...overrides,
  }
}

/** « Maintenant » des tests : mardi 24 novembre 2026, 8h00 (Africa/Lagos). */
export const TOMORROW = studentMeetingJson({ id: 'm-demain', startAt: '2026-11-25T10:00:00+01:00', endAt: '2026-11-25T11:30:00+01:00' })
export const IN_FIVE_DAYS = studentMeetingJson({
  id: 'm-cinq',
  startAt: '2026-11-29T09:00:00+01:00',
  endAt: '2026-11-29T10:00:00+01:00',
  speaker: { fullName: 'Moussa Diop', city: 'Thiès', country: 'Sénégal', skills: [] },
  format: 'ONLINE',
  place: null,
})
export const LATER = studentMeetingJson({ id: 'm-loin', startAt: '2026-12-14T10:00:00+01:00', speaker: { fullName: 'Cheikh Sarr', skills: [] } })
export const OVERDUE = studentMeetingJson({ id: 'm-passee', startAt: '2026-11-20T10:00:00+01:00', endAt: '2026-11-20T11:00:00+01:00', speaker: { fullName: 'Aminata Ba', skills: [] } })
export const COMPLETED_RECENT = studentMeetingJson({
  id: 'm-vecue-1',
  status: 'COMPLETED',
  startAt: '2026-10-22T11:00:00+01:00',
  endAt: '2026-10-22T12:00:00+01:00',
  speaker: { fullName: 'Fatou Ndiaye', city: 'Dakar', country: 'Sénégal', skills: ['Plaidoirie'], jobTitle: 'Avocate' },
})
export const COMPLETED_OLD = studentMeetingJson({ id: 'm-vecue-2', status: 'COMPLETED', startAt: '2026-10-08T10:00:00+01:00', speaker: { fullName: 'Mame Diarra Sow', skills: [] } })
export const CANCELLED = studentMeetingJson({ id: 'm-annulee', status: 'CANCELLED', startAt: '2026-11-26T10:00:00+01:00', speaker: { fullName: 'Rencontre annulée Fantôme', skills: [] } })

/** Ordre du serveur : début du créneau décroissant. */
export const DEFAULT_STUDENT_MEETINGS = [LATER, IN_FIVE_DAYS, CANCELLED, TOMORROW, OVERDUE, COMPLETED_RECENT, COMPLETED_OLD]

export function setupStudent({ meetings = DEFAULT_STUDENT_MEETINGS, me = studentMe, extra = {} }: { meetings?: readonly unknown[]; me?: unknown; extra?: Record<string, Handler> } = {}) {
  const fetchMock = mockApi({
    'GET /api/me': () => jsonResponse(200, me),
    'GET /api/student/meetings': pagedHandler(() => meetings),
    ...extra,
  })
  const calls = (path: string) => fetchMock.mock.calls.filter(([request]) => new URL(request.url).pathname === path)
  return { fetchMock, calls }
}
