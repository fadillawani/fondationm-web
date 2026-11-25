import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '../../../api/client'
import { invalidResponseError } from '../../../api/errors'
import { FETCH_PAGE_SIZE, fetchAllPages } from '../../../api/paging'
import { asRecord, integer, oneOf, text, textList } from '../../../api/wire'

export const MEETING_STATUSES = ['PENDING', 'CONFIRMED', 'REFUSED', 'CANCELLED', 'COMPLETED'] as const
export type FoundationMeetingStatus = (typeof MEETING_STATUSES)[number]
const DECISIONS = ['PENDING', 'VALIDATED', 'REFUSED'] as const
export type PartyDecision = (typeof DECISIONS)[number]
const CLOSERS = ['SPEAKER', 'FOUNDATION', 'SYSTEM'] as const
export type ClosedBy = (typeof CLOSERS)[number]
const FORMATS = ['IN_PERSON', 'ONLINE'] as const

/** Rencontre vue par la Fondation (`FoundationMeetingResponse`, lue de façon défensive : `null` = absent). */
export interface FoundationMeeting {
  id: string
  status: FoundationMeetingStatus
  speakerDecision: PartyDecision | null
  foundationDecision: PartyDecision | null
  schoolName: string
  schoolCity: string
  classTitle: string
  studentCount: number | null
  speakerName: string
  speakerCity: string
  speakerSkills: string[]
  slotId: string | null
  startAt: string
  endAt: string | null
  closedBy: ClosedBy | null
  reason: string | null
  createdAt: string | null
  format: (typeof FORMATS)[number] | null
  place: string | null
  message: string | null
}

export function readFoundationMeeting(value: unknown): FoundationMeeting | null {
  const record = asRecord(value)
  if (record === null) return null
  const id = text(record, 'id')
  const status = oneOf(MEETING_STATUSES, text(record, 'status'))
  const school = asRecord(record.school)
  const schoolClass = asRecord(record.schoolClass)
  const speaker = asRecord(record.speaker)
  const slot = asRecord(record.slot)
  const startAt = slot ? text(slot, 'startAt') : null
  if (id === null || status === null || startAt === null) return null
  return {
    id,
    status,
    speakerDecision: oneOf(DECISIONS, text(record, 'speakerDecision')),
    foundationDecision: oneOf(DECISIONS, text(record, 'foundationDecision')),
    schoolName: (school && text(school, 'name')) ?? 'Établissement',
    schoolCity: (school && text(school, 'city')) ?? '',
    classTitle: (schoolClass && text(schoolClass, 'title')) ?? '',
    studentCount: schoolClass ? integer(schoolClass, 'studentCount') : null,
    speakerName: (speaker && text(speaker, 'fullName')) ?? 'Intervenant',
    speakerCity: (speaker && text(speaker, 'city')) ?? '',
    speakerSkills: speaker ? textList(speaker, 'skills') : [],
    slotId: (slot && text(slot, 'id')) ?? text(record, 'slotId'),
    startAt,
    endAt: slot ? text(slot, 'endAt') : null,
    closedBy: oneOf(CLOSERS, text(record, 'closedBy')),
    reason: text(record, 'reason'),
    createdAt: text(record, 'createdAt'),
    format: oneOf(FORMATS, text(record, 'format')),
    place: text(record, 'place'),
    message: text(record, 'message'),
  }
}

/** Préfixe invalidé après chaque action (listes, pastilles, bandeau, retours). */
export const FOUNDATION_MEETINGS_KEY = ['foundation', 'meetings'] as const

/**
 * Toutes les rencontres, une fois (`size=100`, 25 pages au plus) : partagées par « Demandes de rencontre »,
 * « Rencontres », les deux pastilles de navigation et le bandeau « à marquer ».
 */
export function useFoundationMeetings(enabled = true) {
  return useQuery({
    queryKey: FOUNDATION_MEETINGS_KEY,
    enabled,
    queryFn: () =>
      fetchAllPages(
        (page) => unwrap(api.GET('/api/foundation/meetings', { params: { query: { page, size: FETCH_PAGE_SIZE } } })),
        readFoundationMeeting,
      ),
  })
}

export type MeetingAction =
  | { kind: 'validate'; id: string }
  | { kind: 'refuse'; id: string; reason: string }
  | { kind: 'complete'; id: string }
  | { kind: 'cancel'; id: string; reason: string }

async function run(action: MeetingAction): Promise<unknown> {
  const path = { params: { path: { id: action.id } } }
  switch (action.kind) {
    case 'validate':
      return unwrap(api.POST('/api/foundation/meetings/{id}/validate', path))
    case 'refuse':
      return unwrap(api.POST('/api/foundation/meetings/{id}/refuse', { ...path, body: { reason: action.reason } }))
    case 'complete':
      return unwrap(api.POST('/api/foundation/meetings/{id}/complete', path))
    case 'cancel':
      return unwrap(api.POST('/api/foundation/meetings/{id}/cancel', { ...path, body: { reason: action.reason } }))
  }
}

/** Valider, refuser, marquer « Réalisée », annuler : la réponse est la rencontre mise à jour. */
export function useMeetingAction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (action: MeetingAction) => {
      const updated = readFoundationMeeting(await run(action))
      if (updated === null) throw invalidResponseError()
      return updated
    },
    // Rechargement non attendu : le résultat de l'action s'affiche avant que la sélection par défaut ne change.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: FOUNDATION_MEETINGS_KEY })
    },
  })
}

export type FeedbackState = 'À rédiger' | 'Soumis' | 'Validé'

export interface MeetingFeedbacks {
  school: FeedbackState
  speaker: FeedbackState
}

function stateOf(statuses: readonly string[]): FeedbackState {
  if (statuses.includes('PUBLISHED')) return 'Validé'
  if (statuses.includes('SUBMITTED')) return 'Soumis'
  return 'À rédiger'
}

/** Retours d'une rencontre réalisée : aucun retour = « À rédiger », SUBMITTED = « Soumis », PUBLISHED = « Validé ». */
export function useMeetingFeedbacks(meetingId: string | null) {
  return useQuery({
    queryKey: [...FOUNDATION_MEETINGS_KEY, 'retours', meetingId],
    enabled: meetingId !== null,
    queryFn: async (): Promise<MeetingFeedbacks> => {
      const all = await fetchAllPages(
        (page) =>
          unwrap(
            api.GET('/api/foundation/feedbacks', {
              params: { query: { meetingId: meetingId ?? '', page, size: FETCH_PAGE_SIZE } },
            }),
          ),
        (value) => {
          const record = asRecord(value)
          if (record === null) return null
          const meeting = asRecord(record.meeting)
          const role = text(record, 'authorRole')
          const status = text(record, 'status')
          if (role === null || status === null) return null
          // Le filtre du serveur est revérifié : un retour d'une autre rencontre est ignoré.
          if (meeting && text(meeting, 'id') !== null && text(meeting, 'id') !== meetingId) return null
          return { role, status }
        },
      )
      return {
        school: stateOf(all.items.filter((item) => item.role === 'SCHOOL').map((item) => item.status)),
        speaker: stateOf(all.items.filter((item) => item.role === 'SPEAKER').map((item) => item.status)),
      }
    },
  })
}
