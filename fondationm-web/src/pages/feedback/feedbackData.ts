import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '../../api/client'
import { ApiError, ERROR_CODES, errorFromException, invalidResponseError } from '../../api/errors'
import { FETCH_PAGE_SIZE, fetchAllPages } from '../../api/paging'
import { asRecord, integer, oneOf, text } from '../../api/wire'
import type { FeedbackRole } from './feedbackText'

const STATUSES = ['SUBMITTED', 'PUBLISHED'] as const
export type FeedbackStatus = (typeof STATUSES)[number]

/** Retour rédigé par l'école ou l'intervenant connecté (`FeedbackResponse`, lu de façon défensive). */
export interface MyFeedback {
  id: string
  meetingId: string
  rating: number | null
  comment: string | null
  status: FeedbackStatus
  startAt: string | null
  endAt: string | null
  updatedAt: string | null
  publishedAt: string | null
}

export function readMyFeedback(value: unknown): MyFeedback | null {
  const record = asRecord(value)
  const meeting = record && asRecord(record.meeting)
  const id = record && text(record, 'id')
  const meetingId = meeting && text(meeting, 'id')
  const status = record && oneOf(STATUSES, text(record, 'status'))
  if (record === null || !id || !meetingId || !status) return null
  const rating = integer(record, 'rating')
  return {
    id,
    meetingId,
    rating: rating !== null && rating >= 1 && rating <= 5 ? rating : null,
    comment: typeof record.comment === 'string' ? record.comment : null,
    status,
    startAt: meeting && text(meeting, 'slotStartAt'),
    endAt: meeting && text(meeting, 'slotEndAt'),
    updatedAt: text(record, 'updatedAt'),
    publishedAt: text(record, 'publishedAt'),
  }
}

/** Rencontre réalisée sans retour (`School/SpeakerAwaitingFeedbackResponse`). */
export interface AwaitingFeedback {
  meetingId: string
  startAt: string | null
  endAt: string | null
  classTitle: string
  studentCount: number | null
  /** École : l'intervenant ; intervenant : l'établissement. */
  partnerName: string | null
  partnerCity: string
}

function readAwaiting(role: FeedbackRole) {
  return (value: unknown): AwaitingFeedback | null => {
    const record = asRecord(value)
    const meetingId = record && text(record, 'meetingId')
    if (record === null || !meetingId) return null
    const slot = asRecord(record.slot)
    const schoolClass = asRecord(record.schoolClass)
    const partner = asRecord(role === 'school' ? record.speaker : record.school)
    return {
      meetingId,
      startAt: slot && text(slot, 'startAt'),
      endAt: slot && text(slot, 'endAt'),
      classTitle: (schoolClass && text(schoolClass, 'title')) ?? '',
      studentCount: schoolClass && integer(schoolClass, 'studentCount'),
      partnerName: partner && text(partner, role === 'school' ? 'fullName' : 'name'),
      partnerCity: (partner && text(partner, 'city')) ?? '',
    }
  }
}

/** Préfixe invalidé après un envoi (listes, états de « Mes rencontres »). */
export function feedbackKey(role: FeedbackRole) {
  return [role, 'feedbacks'] as const
}

/** Tous les retours rédigés (SUBMITTED et PUBLISHED, toutes les pages). */
export function writtenFeedbacksQuery(role: FeedbackRole) {
  return queryOptions({
    queryKey: [...feedbackKey(role), 'rediges'],
    queryFn: () =>
      fetchAllPages(
        (page) =>
          unwrap(
            role === 'school'
              ? api.GET('/api/school/feedbacks', { params: { query: { page, size: FETCH_PAGE_SIZE } } })
              : api.GET('/api/speaker/feedbacks', { params: { query: { page, size: FETCH_PAGE_SIZE } } }),
          ),
        readMyFeedback,
      ),
  })
}

/** Rencontres réalisées dont le retour reste à rédiger (toutes les pages). */
export function awaitingFeedbacksQuery(role: FeedbackRole) {
  return queryOptions({
    queryKey: [...feedbackKey(role), 'en-attente'],
    queryFn: () =>
      fetchAllPages(
        (page) =>
          unwrap(
            role === 'school'
              ? api.GET('/api/school/feedbacks/awaiting', { params: { query: { page, size: FETCH_PAGE_SIZE } } })
              : api.GET('/api/speaker/feedbacks/awaiting', { params: { query: { page, size: FETCH_PAGE_SIZE } } }),
          ),
        readAwaiting(role),
      ),
  })
}

export function useWrittenFeedbacks(role: FeedbackRole) {
  return useQuery(writtenFeedbacksQuery(role))
}

export function useAwaitingFeedbacks(role: FeedbackRole) {
  return useQuery(awaitingFeedbacksQuery(role))
}

export interface SaveFeedback {
  meetingId: string
  /** true : un retour existe déjà (SUBMITTED), il est modifié par PATCH. */
  existing: boolean
  comment: string
  rating: number | null
}

/** Corps envoyé : `rating` en chaîne, comme le type généré du contrat (décision 89) ; l'école n'en envoie pas. */
export function feedbackBody(role: FeedbackRole, comment: string, rating: number | null): { comment: string; rating?: string } {
  return role === 'speaker' && rating !== null ? { rating: String(rating), comment } : { comment }
}

function send(role: FeedbackRole, method: 'POST' | 'PATCH', meetingId: string, body: { comment: string; rating?: string }) {
  const params = { params: { path: { meetingId } }, body }
  if (role === 'school') {
    return unwrap(
      method === 'POST'
        ? api.POST('/api/school/meetings/{meetingId}/feedback', params)
        : api.PATCH('/api/school/meetings/{meetingId}/feedback', params),
    )
  }
  return unwrap(
    method === 'POST'
      ? api.POST('/api/speaker/meetings/{meetingId}/feedback', params)
      : api.PATCH('/api/speaker/meetings/{meetingId}/feedback', params),
  )
}

async function sent(call: Promise<unknown>): Promise<MyFeedback> {
  const feedback = readMyFeedback(await call)
  if (feedback === null) throw invalidResponseError()
  return feedback
}

/**
 * Partage ou mise à jour d'un retour. Si le POST échoue sans erreur de champ (doublon ou autre, aucun code n'est
 * documenté), la liste est relue : si un retour SUBMITTED existe pour la rencontre, un seul PATCH est envoyé avec
 * le même corps (décision 93). Sinon l'erreur d'origine est rendue.
 */
export function useSaveFeedback(role: FeedbackRole) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ meetingId, existing, comment, rating }: SaveFeedback) => {
      const body = feedbackBody(role, comment, rating)
      if (existing) return sent(send(role, 'PATCH', meetingId, body))
      try {
        return await sent(send(role, 'POST', meetingId, body))
      } catch (error) {
        // FEEDBACK_ALREADY_EXISTS (doublon documenté) ou erreur sans champ : relecture, puis un seul PATCH (décision 93).
        if (errorFromException(error).fieldErrors.length > 0) throw error
        const written = await queryClient.fetchQuery({ ...writtenFeedbacksQuery(role), staleTime: 0 })
        const duplicate = written.items.find((feedback) => feedback.meetingId === meetingId)
        if (duplicate?.status === 'PUBLISHED') {
          // Retour déjà validé : aucun PATCH, message du code FEEDBACK_PUBLISHED (décision 127).
          throw new ApiError({ status: 409, code: ERROR_CODES.FEEDBACK_PUBLISHED, message: '' })
        }
        if (duplicate?.status !== 'SUBMITTED') throw error
        return sent(send(role, 'PATCH', meetingId, body))
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: feedbackKey(role) })
    },
  })
}
