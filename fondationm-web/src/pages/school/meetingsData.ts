import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '../../api/client'
import { FETCH_PAGE_SIZE, fetchAllPages } from '../../api/paging'
import { asRecord, integer, oneOf, text } from '../../api/wire'
import { parseIso } from '../../lib/dateTime'
import { useNow } from '../../lib/useNow'
import { useAwaitingFeedbacks, useWrittenFeedbacks } from '../feedback/feedbackData'

export const MEETING_STATUSES = ['PENDING', 'CONFIRMED', 'REFUSED', 'CANCELLED', 'COMPLETED'] as const
export type MeetingStatus = (typeof MEETING_STATUSES)[number]
const CLOSERS = ['SPEAKER', 'FOUNDATION', 'SYSTEM'] as const
export type Closer = (typeof CLOSERS)[number]
const FORMATS = ['IN_PERSON', 'ONLINE'] as const

/** Rencontre de l'école (SchoolMeetingResponse), lue défensivement. */
export interface SchoolMeeting {
  id: string
  status: MeetingStatus
  speakerId: string | null
  speakerName: string
  speakerCity: string
  classTitle: string
  studentCount: number | null
  startAt: string
  endAt: string
  closedBy: Closer | null
  reason: string | null
  confirmedAt: string | null
  refusedAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  format: (typeof FORMATS)[number] | null
  place: string | null
}

/** État du retour d'expérience de l'école sur une rencontre réalisée. */
export type FeedbackState = 'À rédiger' | 'Soumis' | 'Validé'

export function readSchoolMeeting(value: unknown): SchoolMeeting | null {
  const record = asRecord(value)
  if (record === null) return null
  const id = text(record, 'id')
  const status = oneOf(MEETING_STATUSES, text(record, 'status'))
  const slot = asRecord(record.slot)
  const startAt = slot && text(slot, 'startAt')
  const endAt = slot && text(slot, 'endAt')
  // Sans créneau lisible, la rencontre ne peut pas être placée dans le calendrier.
  if (id === null || status === null || !startAt || !endAt || parseIso(startAt) === null) return null
  const speaker = asRecord(record.speaker)
  const schoolClass = asRecord(record.schoolClass)
  return {
    id,
    status,
    speakerId: speaker && text(speaker, 'id'),
    speakerName: (speaker && text(speaker, 'fullName')) ?? 'Intervenant',
    speakerCity: (speaker && text(speaker, 'city')) ?? '',
    classTitle: (schoolClass && text(schoolClass, 'title')) ?? '',
    studentCount: schoolClass && integer(schoolClass, 'studentCount'),
    startAt,
    endAt,
    closedBy: oneOf(CLOSERS, text(record, 'closedBy')),
    reason: text(record, 'reason'),
    confirmedAt: text(record, 'confirmedAt'),
    refusedAt: text(record, 'refusedAt'),
    completedAt: text(record, 'completedAt'),
    cancelledAt: text(record, 'cancelledAt'),
    format: oneOf(FORMATS, text(record, 'format')),
    place: text(record, 'place'),
  }
}

/** Toutes les rencontres de l'école (toutes les pages) : calendrier, listes, pastille, bandeau de refus (F4). */
export const schoolMeetingsQuery = {
  queryKey: ['school', 'meetings', 'toutes'] as const,
  queryFn: () =>
    fetchAllPages(
      (page) => unwrap(api.GET('/api/school/meetings', { params: { query: { page, size: FETCH_PAGE_SIZE } } })),
      readSchoolMeeting,
    ),
}

export function useSchoolMeetings(enabled = true) {
  return useQuery({ ...schoolMeetingsQuery, enabled })
}

/**
 * Retours d'expérience : en attente (« À rédiger ») et rédigés (« Soumis » / « Validé »), par rencontre. Mêmes
 * requêtes que les pages « Retours d'expérience » (F9).
 */
export function useFeedbackStates() {
  const awaiting = useAwaitingFeedbacks('school')
  const written = useWrittenFeedbacks('school')
  const states = new Map<string, FeedbackState>()
  for (const entry of written.data?.items ?? []) states.set(entry.meetingId, entry.status === 'PUBLISHED' ? 'Validé' : 'Soumis')
  for (const entry of awaiting.data?.items ?? []) states.set(entry.meetingId, 'À rédiger')
  return states
}

/** Rencontre encore à venir (fin du créneau dans le futur). */
export function isUpcoming(meeting: SchoolMeeting, now: Date): boolean {
  return (parseIso(meeting.endAt)?.getTime() ?? 0) >= now.getTime()
}

/** Pastille « Mes rencontres » : rencontres PENDING ou CONFIRMED à venir (mêmes données, aucune requête de plus). */
export function useUpcomingMeetingsCount(enabled: boolean): number | undefined {
  const now = useNow()
  const meetings = useSchoolMeetings(enabled)
  return meetings.data?.items.filter(
    (meeting) => (meeting.status === 'PENDING' || meeting.status === 'CONFIRMED') && isUpcoming(meeting, now),
  ).length
}
