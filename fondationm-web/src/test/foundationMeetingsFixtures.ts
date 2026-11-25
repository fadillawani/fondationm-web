import { foundationMe, jsonResponse, mockApi, pagedHandler } from './helpers'

/** Rencontre telle que renvoyée par `GET /api/foundation/meetings` (contrat FoundationMeetingResponse). */
export type FoundationMeetingJson = Record<string, unknown> & { id: string; status: string }

let next = 0

export function foundationMeetingJson(overrides: Partial<FoundationMeetingJson> & { start: string; end: string; slotId?: string }) {
  const { start, end, slotId, ...rest } = overrides
  next += 1
  return {
    id: `f7000000-0000-4000-8000-${String(next).padStart(12, '0')}`,
    status: 'PENDING',
    speakerDecision: 'PENDING',
    foundationDecision: 'PENDING',
    school: { name: 'Lycée de Sor', city: 'Saint-Louis', country: 'Sénégal' },
    schoolClass: { title: 'Terminale S2', studentCount: 32 },
    speaker: { id: 'e7000000-0000-4000-8000-000000000001', fullName: 'Amadou Baila', city: 'Dakar', country: 'Sénégal', skills: ['Réseaux', 'Télécoms', 'Fibre optique'] },
    slot: { id: slotId ?? `s7000000-0000-4000-8000-${String(next).padStart(12, '0')}`, startAt: start, endAt: end },
    closedBy: null,
    reason: null,
    createdAt: '2026-11-20T09:00:00+01:00',
    confirmedAt: null,
    refusedAt: null,
    completedAt: null,
    cancelledAt: null,
    format: 'IN_PERSON',
    place: 'Salle 4',
    message: null,
    ...rest,
  } as FoundationMeetingJson
}

const SHARED_SLOT = 's7000000-0000-4000-8000-0000000000aa'

/** « Maintenant » des tests : mardi 24 novembre 2026, 8h00 (Africa/Lagos). */
export const REQUEST_SOR = foundationMeetingJson({
  start: '2026-11-26T10:00:00+01:00',
  end: '2026-11-26T11:30:00+01:00',
  slotId: SHARED_SLOT,
  message: 'Nos élèves hésitent entre la médecine et les écoles d’ingénieurs.',
})
export const REQUEST_YOFF = foundationMeetingJson({
  start: '2026-11-26T10:00:00+01:00',
  end: '2026-11-26T11:30:00+01:00',
  slotId: SHARED_SLOT,
  school: { name: 'Lycée de Grand-Yoff', city: 'Dakar', country: 'Sénégal' },
  schoolClass: { title: 'Première S1', studentCount: 41 },
  speakerDecision: 'VALIDATED',
  createdAt: '2026-11-23T09:00:00+01:00',
})
export const VALIDATED_BY_US = foundationMeetingJson({
  start: '2026-11-27T11:00:00+01:00',
  end: '2026-11-27T12:00:00+01:00',
  foundationDecision: 'VALIDATED',
  school: { name: 'Lycée de Mbour', city: 'Mbour', country: 'Sénégal' },
  speaker: { fullName: 'Cheikh Tidiane Gueye', city: 'Saint-Louis', skills: [] },
})
export const TO_MARK = foundationMeetingJson({
  status: 'CONFIRMED',
  speakerDecision: 'VALIDATED',
  foundationDecision: 'VALIDATED',
  start: '2026-11-17T10:00:00+01:00',
  end: '2026-11-17T11:30:00+01:00',
  school: { name: 'Lycée de Kaffrine', city: 'Kaffrine', country: 'Sénégal' },
  speaker: { fullName: 'Awa Sarr', city: 'Dakar', skills: ['Data'] },
})
export const UPCOMING = foundationMeetingJson({
  status: 'CONFIRMED',
  speakerDecision: 'VALIDATED',
  foundationDecision: 'VALIDATED',
  start: '2026-11-25T14:00:00+01:00',
  end: '2026-11-25T15:30:00+01:00',
  school: { name: 'Lycée de Thiès', city: 'Thiès', country: 'Sénégal' },
})
export const COMPLETED = foundationMeetingJson({
  status: 'COMPLETED',
  speakerDecision: 'VALIDATED',
  foundationDecision: 'VALIDATED',
  start: '2026-11-04T14:00:00+01:00',
  end: '2026-11-04T15:00:00+01:00',
  speaker: { fullName: 'Aïssatou Diop', city: 'Saint-Louis', skills: [] },
})
export const REFUSED_BY_US = foundationMeetingJson({
  status: 'REFUSED',
  foundationDecision: 'REFUSED',
  closedBy: 'FOUNDATION',
  reason: 'Classe déjà rencontrée ce mois-ci.',
  start: '2026-11-18T10:00:00+01:00',
  end: '2026-11-18T11:30:00+01:00',
  school: { name: 'Lycée de Louga', city: 'Louga', country: 'Sénégal' },
})
export const SLOT_TAKEN = foundationMeetingJson({
  status: 'REFUSED',
  closedBy: 'SYSTEM',
  start: '2026-11-25T14:00:00+01:00',
  end: '2026-11-25T15:30:00+01:00',
  school: { name: 'Lycée de Rufisque', city: 'Rufisque', country: 'Sénégal' },
})
export const CANCELLED = foundationMeetingJson({
  status: 'CANCELLED',
  closedBy: 'FOUNDATION',
  reason: '',
  start: '2026-11-12T15:00:00+01:00',
  end: '2026-11-12T16:00:00+01:00',
  school: { name: 'Lycée de Kolda', city: 'Kolda', country: 'Sénégal' },
})

export const DEFAULT_FOUNDATION_MEETINGS = [
  REQUEST_SOR,
  REQUEST_YOFF,
  VALIDATED_BY_US,
  TO_MARK,
  UPCOMING,
  COMPLETED,
  REFUSED_BY_US,
  SLOT_TAKEN,
  CANCELLED,
]

export type Handler = Parameters<typeof mockApi>[0][string]

export interface FoundationMeetingsSetup {
  meetings?: FoundationMeetingJson[]
  feedbacks?: Record<string, unknown>[]
  /** Taille de page maximale imposée par le « serveur » (pagination suivie). */
  maxSize?: number
  extra?: Record<string, Handler>
  me?: unknown
}

/** Backend simulé de l'espace Fondation : rencontres (actions comprises) et retours. */
export function setupFoundationMeetings({ meetings, feedbacks = [], maxSize = 100, extra = {}, me = foundationMe }: FoundationMeetingsSetup = {}) {
  const store = { meetings: [...(meetings ?? DEFAULT_FOUNDATION_MEETINGS)], feedbacks: [...feedbacks] }
  const bodies: { key: string; body: unknown }[] = []

  function act(id: string, change: (meeting: FoundationMeetingJson) => FoundationMeetingJson) {
    const index = store.meetings.findIndex((meeting) => meeting.id === id)
    const current = store.meetings[index]
    if (current === undefined) return jsonResponse(404, { code: 'NOT_FOUND', message: 'Rencontre introuvable.' })
    const updated = change(current)
    store.meetings[index] = updated
    return jsonResponse(200, updated)
  }

  const handlers: Record<string, Handler> = {
    'GET /api/me': () => jsonResponse(200, me),
    'GET /api/foundation/accounts': pagedHandler(() => []),
    'GET /api/foundation/meetings': (request) => pagedHandler(() => store.meetings, maxSize)(request),
    'GET /api/foundation/feedbacks': (request) => {
      const meetingId = new URL(request.url).searchParams.get('meetingId')
      return pagedHandler(() => store.feedbacks.filter((feedback) => (feedback.meeting as { id?: string } | undefined)?.id === meetingId))(request)
    },
  }
  for (const meeting of store.meetings) {
    const base = `/api/foundation/meetings/${meeting.id}`
    const record = (kind: string) => async (request: Request) => {
      const text = await request.text()
      bodies.push({ key: `${kind} ${meeting.id}`, body: text ? JSON.parse(text) : null })
      return null
    }
    handlers[`POST ${base}/validate`] = async (request) => {
      await record('validate')(request)
      return act(meeting.id, (current) => ({ ...current, foundationDecision: 'VALIDATED' }))
    }
    handlers[`POST ${base}/refuse`] = async (request) => {
      await record('refuse')(request)
      const reason = (bodies.at(-1)?.body as { reason?: string } | null)?.reason ?? ''
      return act(meeting.id, (current) => ({ ...current, status: 'REFUSED', foundationDecision: 'REFUSED', closedBy: 'FOUNDATION', reason }))
    }
    handlers[`POST ${base}/complete`] = async (request) => {
      await record('complete')(request)
      return act(meeting.id, (current) => ({ ...current, status: 'COMPLETED' }))
    }
    handlers[`POST ${base}/cancel`] = async (request) => {
      await record('cancel')(request)
      const reason = (bodies.at(-1)?.body as { reason?: string } | null)?.reason ?? ''
      return act(meeting.id, (current) => ({ ...current, status: 'CANCELLED', closedBy: 'FOUNDATION', reason }))
    }
  }
  const fetchMock = mockApi({ ...handlers, ...extra })
  const calls = (method: string, path: string) =>
    fetchMock.mock.calls
      .map(([request]) => request)
      .filter((request) => request.method === method && new URL(request.url).pathname === path)
  return { store, bodies, fetchMock, calls }
}
