import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '../../../api/client'
import { invalidResponseError } from '../../../api/errors'
import { FETCH_PAGE_SIZE, fetchAllPages, type Collection } from '../../../api/paging'
import { asRecord, integer, oneOf, text, textList } from '../../../api/wire'
import { readPhotoUrl } from '../../../lib/photo'
import { FOUNDATION_MEETINGS_KEY } from '../meetings/foundationMeetingsData'

const ROLES = ['SCHOOL', 'SPEAKER'] as const
const STATUSES = ['SUBMITTED', 'PUBLISHED'] as const

/** Retour vu par la Fondation (`FoundationFeedbackResponse`, lu de façon défensive : `null` = absent). */
export interface FoundationFeedback {
  id: string
  meetingId: string
  authorRole: (typeof ROLES)[number]
  status: (typeof STATUSES)[number]
  rating: number | null
  comment: string | null
  startAt: string | null
  endAt: string | null
  schoolName: string
  schoolCity: string
  /** Logo et photo (F13) : schémas fusionnés, donc facultatifs. */
  schoolPhotoUrl: string | null
  speakerPhotoUrl: string | null
  classTitle: string
  studentCount: number | null
  speakerName: string
  speakerSkills: string[]
  updatedAt: string | null
  publishedAt: string | null
}

export function readFoundationFeedback(value: unknown): FoundationFeedback | null {
  const record = asRecord(value)
  if (record === null) return null
  const meeting = asRecord(record.meeting)
  const id = text(record, 'id')
  const meetingId = meeting && text(meeting, 'id')
  const authorRole = oneOf(ROLES, text(record, 'authorRole'))
  const status = oneOf(STATUSES, text(record, 'status'))
  if (!id || !meetingId || !authorRole || !status) return null
  const school = asRecord(record.school)
  const schoolClass = asRecord(record.schoolClass)
  const speaker = asRecord(record.speaker)
  const rating = integer(record, 'rating')
  return {
    id,
    meetingId,
    authorRole,
    status,
    rating: rating !== null && rating >= 1 && rating <= 5 ? rating : null,
    comment: typeof record.comment === 'string' ? record.comment : null,
    startAt: meeting && text(meeting, 'slotStartAt'),
    endAt: meeting && text(meeting, 'slotEndAt'),
    schoolName: (school && text(school, 'name')) ?? 'Établissement',
    schoolCity: (school && text(school, 'city')) ?? '',
    schoolPhotoUrl: readPhotoUrl(school),
    speakerPhotoUrl: readPhotoUrl(speaker),
    classTitle: (schoolClass && text(schoolClass, 'title')) ?? '',
    studentCount: schoolClass && integer(schoolClass, 'studentCount'),
    speakerName: (speaker && text(speaker, 'fullName')) ?? 'Intervenant',
    speakerSkills: speaker ? textList(speaker, 'skills') : [],
    updatedAt: text(record, 'updatedAt'),
    publishedAt: text(record, 'publishedAt'),
  }
}

export const FOUNDATION_FEEDBACKS_KEY = ['foundation', 'feedbacks', 'tous'] as const

/** Tous les retours, une fois (`size=100`, 25 pages au plus) : page « Retours d'expérience » et pastille. */
export function useFoundationFeedbacks(enabled = true) {
  return useQuery({
    queryKey: FOUNDATION_FEEDBACKS_KEY,
    enabled,
    queryFn: () =>
      fetchAllPages(
        (page) => unwrap(api.GET('/api/foundation/feedbacks', { params: { query: { page, size: FETCH_PAGE_SIZE } } })),
        readFoundationFeedback,
      ),
  })
}

/** Pastille « Retours d'expérience » : retours SUBMITTED (même compte que « À valider · N »). */
export function useFeedbacksToValidateCount(enabled: boolean): number | undefined {
  const feedbacks = useFoundationFeedbacks(enabled)
  return feedbacks.data?.items.filter((feedback) => feedback.status === 'SUBMITTED').length
}

/**
 * Publication (`POST /{id}/publish`), irréversible. Le retour renvoyé remplace celui de la liste en attendant le
 * rechargement (non attendu) ; le tableau de bord et les cases de « Rencontres » sont aussi rechargés.
 */
export function usePublishFeedback() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const published = readFoundationFeedback(await unwrap(api.POST('/api/foundation/feedbacks/{id}/publish', { params: { path: { id } } })))
      if (published === null) throw invalidResponseError()
      return published
    },
    onSuccess: (published) => {
      queryClient.setQueryData<Collection<FoundationFeedback>>(FOUNDATION_FEEDBACKS_KEY, (current) =>
        current === undefined
          ? current
          : { ...current, items: current.items.map((feedback) => (feedback.id === published.id ? published : feedback)) },
      )
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['foundation', 'feedbacks'] })
      void queryClient.invalidateQueries({ queryKey: ['foundation', 'moment'] })
      void queryClient.invalidateQueries({ queryKey: ['foundation', 'indicateurs'] })
      void queryClient.invalidateQueries({ queryKey: [...FOUNDATION_MEETINGS_KEY, 'retours'] })
    },
  })
}
