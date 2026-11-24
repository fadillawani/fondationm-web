import { errorResponse, pagedHandler } from './helpers'
import { AMINATA, AWA, FATOU, MOUSSA, setupSchool } from './schoolFixtures'

function speaker(json: { id: string; fullName: string; city?: unknown }) {
  return { id: json.id, fullName: json.fullName, city: json.city ?? 'Dakar', country: 'Sénégal', skills: [] }
}

function meeting(overrides: Record<string, unknown> & { id: string; status: string; startAt: string; endAt: string }) {
  const { startAt, endAt, ...rest } = overrides
  return {
    schoolClass: { title: 'Terminale S2', studentCount: 32 },
    speaker: speaker(AWA),
    slot: { id: `slot-${overrides.id}`, startAt, endAt },
    closedBy: null,
    reason: null,
    createdAt: '2026-11-10T10:00:00+01:00',
    confirmedAt: null,
    refusedAt: null,
    completedAt: null,
    cancelledAt: null,
    format: 'IN_PERSON',
    place: 'Salle 12',
    message: null,
    ...rest,
  }
}

/** « Maintenant » des tests : mardi 24 novembre 2026, 8h00 (voir speakerFixtures). */
export const CONFIRMED = meeting({
  id: 'c5000000-0000-4000-8000-000000000001',
  status: 'CONFIRMED',
  startAt: '2026-11-28T10:00:00+01:00',
  endAt: '2026-11-28T11:30:00+01:00',
  format: 'ONLINE',
  place: 'salle informatique',
  confirmedAt: '2026-11-20T10:00:00+01:00',
})
export const PENDING = meeting({
  id: 'c5000000-0000-4000-8000-000000000002',
  status: 'PENDING',
  speaker: speaker(MOUSSA),
  schoolClass: { title: 'Première L', studentCount: 28 },
  startAt: '2026-11-30T09:30:00+01:00',
  endAt: '2026-11-30T10:30:00+01:00',
  place: 'CDI, bâtiment B',
})
export const REFUSED_BY_SPEAKER = meeting({
  id: 'c5000000-0000-4000-8000-000000000003',
  status: 'REFUSED',
  speaker: speaker(FATOU),
  startAt: '2026-11-26T15:00:00+01:00',
  endAt: '2026-11-26T16:00:00+01:00',
  closedBy: 'SPEAKER',
  reason: 'Je suis de garde ce jeudi.',
  refusedAt: '2026-11-22T10:00:00+01:00',
})
export const COMPLETED_TO_WRITE = meeting({
  id: 'c5000000-0000-4000-8000-000000000004',
  status: 'COMPLETED',
  speaker: speaker(AMINATA),
  schoolClass: { title: 'Terminale L2', studentCount: 30 },
  startAt: '2026-11-04T14:00:00+01:00',
  endAt: '2026-11-04T15:00:00+01:00',
  confirmedAt: '2026-10-30T10:00:00+01:00',
  completedAt: '2026-11-04T15:00:00+01:00',
})
export const COMPLETED_PUBLISHED = meeting({
  id: 'c5000000-0000-4000-8000-000000000005',
  status: 'COMPLETED',
  startAt: '2026-10-22T11:00:00+01:00',
  endAt: '2026-10-22T12:00:00+01:00',
  confirmedAt: '2026-10-15T10:00:00+01:00',
  completedAt: '2026-10-22T12:00:00+01:00',
})
export const CANCELLED = meeting({
  id: 'c5000000-0000-4000-8000-000000000006',
  status: 'CANCELLED',
  speaker: speaker(MOUSSA),
  schoolClass: { title: 'Première S1', studentCount: 35 },
  startAt: '2026-11-12T16:00:00+01:00',
  endAt: '2026-11-12T17:00:00+01:00',
  closedBy: 'FOUNDATION',
  reason: 'Empêchement de dernière minute.',
  confirmedAt: '2026-11-05T10:00:00+01:00',
  cancelledAt: '2026-11-11T10:00:00+01:00',
})
export const SLOT_TAKEN = meeting({
  id: 'c5000000-0000-4000-8000-000000000007',
  status: 'REFUSED',
  startAt: '2026-12-03T14:00:00+01:00',
  endAt: '2026-12-03T15:00:00+01:00',
  closedBy: 'SYSTEM',
  reason: 'Ce créneau a été attribué à une autre demande.',
})

export const ALL_MEETINGS = [CONFIRMED, PENDING, REFUSED_BY_SPEAKER, COMPLETED_TO_WRITE, COMPLETED_PUBLISHED, CANCELLED, SLOT_TAKEN]

/** École avec ses rencontres, ses retours d'expérience et les fiches des intervenants (404 sauf Awa). */
export function setupMeetings(meetings: readonly Record<string, unknown>[] = ALL_MEETINGS) {
  return setupSchool(
    { refused: [...meetings] },
    {
      'GET /api/school/feedbacks/awaiting': pagedHandler(() => [
        { meetingId: COMPLETED_TO_WRITE.id, slot: { startAt: COMPLETED_TO_WRITE.slot.startAt }, completedAt: COMPLETED_TO_WRITE.completedAt },
      ]),
      'GET /api/school/feedbacks': pagedHandler(() => [
        { id: 'fb000000-0000-4000-8000-000000000001', meeting: { id: COMPLETED_PUBLISHED.id }, status: 'PUBLISHED', rating: 5 },
      ]),
      [`GET /api/school/speakers/${FATOU.id}`]: () => errorResponse(404, 'NOT_FOUND'),
      [`GET /api/school/speakers/${MOUSSA.id}`]: () => errorResponse(404, 'NOT_FOUND'),
      [`GET /api/school/speakers/${AMINATA.id}`]: () => errorResponse(404, 'NOT_FOUND'),
    },
  )
}
