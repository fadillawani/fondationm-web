import { jsonResponse, pagedHandler } from './helpers'

/** Retour tel que renvoyé par `GET /api/{school|speaker}/feedbacks` (contrat FeedbackResponse). */
export type FeedbackJson = Record<string, unknown> & { id: string; meeting: { id: string; slotStartAt?: string; slotEndAt?: string }; status: string }

let next = 0

export function feedbackJson(meetingId: string, overrides: Partial<FeedbackJson> = {}): FeedbackJson {
  next += 1
  return {
    id: `f9000000-0000-4000-8000-${String(next).padStart(12, '0')}`,
    meeting: { id: meetingId, slotStartAt: '2026-11-04T14:00:00+01:00', slotEndAt: '2026-11-04T15:00:00+01:00' },
    rating: null,
    comment: '[Moment marquant] La classe s’est tue.',
    status: 'SUBMITTED',
    createdAt: '2026-11-05T10:00:00+01:00',
    updatedAt: '2026-11-05T10:00:00+01:00',
    publishedAt: null,
    ...overrides,
  }
}

export interface FeedbackStore {
  awaiting: Record<string, unknown>[]
  written: FeedbackJson[]
}

type Handler = (request: Request) => Response | Promise<Response>

/**
 * Backend simulé des retours de l'école ou de l'intervenant : listes paginées, POST (201, 409 si un retour existe
 * déjà) et PATCH (200, 409 si le retour est publié) pour chaque rencontre de `meetingIds`.
 */
export function feedbackBackend(role: 'school' | 'speaker', initial: FeedbackStore, meetingIds: readonly string[]) {
  const store: FeedbackStore = { awaiting: [...initial.awaiting], written: [...initial.written] }
  const bodies: { method: string; meetingId: string; raw: string }[] = []
  const handlers: Record<string, Handler> = {
    [`GET /api/${role}/feedbacks/awaiting`]: pagedHandler(() => store.awaiting),
    [`GET /api/${role}/feedbacks`]: pagedHandler(() => store.written),
  }
  for (const meetingId of meetingIds) {
    const path = `/api/${role}/meetings/${meetingId}/feedback`
    handlers[`POST ${path}`] = async (request) => {
      const raw = await request.text()
      bodies.push({ method: 'POST', meetingId, raw })
      if (store.written.some((feedback) => feedback.meeting.id === meetingId)) {
        return jsonResponse(409, { code: 'FEEDBACK_ALREADY_EXISTS', message: 'Un retour existe déjà.', fieldErrors: [] })
      }
      const body = JSON.parse(raw) as { comment: string; rating?: string }
      const created = feedbackJson(meetingId, { comment: body.comment, rating: body.rating === undefined ? null : Number(body.rating) })
      store.written.push(created)
      store.awaiting = store.awaiting.filter((entry) => entry.meetingId !== meetingId)
      return jsonResponse(201, created)
    }
    handlers[`PATCH ${path}`] = async (request) => {
      const raw = await request.text()
      bodies.push({ method: 'PATCH', meetingId, raw })
      const index = store.written.findIndex((feedback) => feedback.meeting.id === meetingId)
      const current = store.written[index]
      if (current === undefined) return jsonResponse(404, { code: 'NOT_FOUND', message: 'Aucun retour.', fieldErrors: [] })
      if (current.status === 'PUBLISHED') return jsonResponse(409, { code: 'FEEDBACK_ALREADY_PUBLISHED', message: 'Retour déjà publié.', fieldErrors: [] })
      const body = JSON.parse(raw) as { comment?: string; rating?: string }
      const updated = { ...current, comment: body.comment ?? current.comment, rating: body.rating === undefined ? current.rating : Number(body.rating) }
      store.written[index] = updated
      return jsonResponse(200, updated)
    }
  }
  return { store, bodies, handlers }
}

/** Retour vu par la Fondation (contrat FoundationFeedbackResponse). */
export function foundationFeedbackJson(overrides: Record<string, unknown> & { id: string; meetingId: string; startAt: string }) {
  const { meetingId, startAt, ...rest } = overrides
  return {
    meeting: { id: meetingId, slotStartAt: startAt, slotEndAt: null },
    school: { name: 'Lycée de Sor', city: 'Saint-Louis', country: 'Sénégal' },
    schoolClass: { title: 'Terminale L2', studentCount: 38 },
    speaker: { id: 'e9000000-0000-4000-8000-000000000001', fullName: 'Aïssatou Diop', city: 'Saint-Louis', country: 'Sénégal', skills: [] },
    authorRole: 'SCHOOL',
    rating: null,
    comment: '',
    status: 'SUBMITTED',
    createdAt: '2026-11-05T10:00:00+01:00',
    updatedAt: '2026-11-05T10:00:00+01:00',
    publishedAt: null,
    ...rest,
  }
}
