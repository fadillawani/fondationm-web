import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '../../api/client'
import { invalidResponseError } from '../../api/errors'
import { FETCH_PAGE_SIZE, fetchAllPages, type Collection } from '../../api/paging'
import { asRecord, integer, oneOf, text } from '../../api/wire'
import { periodQuery, type Period } from '../../lib/period'

/*
 * Chaque `GET /api/donor/impact` réussi et chaque page 0 de `GET /api/donor/feedbacks` compte comme une
 * « consultation » côté Fondation (onglet « Donateurs », F8). Ces requêtes ne se relancent donc jamais d'elles-mêmes :
 * données gardées pour la session, ni rechargement au focus, à la reconnexion ou au montage (décision 99).
 */
const COUNTED = {
  staleTime: Number.POSITIVE_INFINITY,
  gcTime: Number.POSITIVE_INFINITY,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  refetchOnMount: false,
} as const

function number(record: Record<string, unknown>, key: string): number | null {
  const value = record[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

// ——— Impact ———

export interface DonorImpact {
  completedMeetings: number | null
  distinctClasses: number | null
  distinctSchools: number | null
  distinctSpeakers: number | null
  studentsReached: number | null
  publishedFeedbacks: number | null
  rating: { overall: number | null; school: number | null; speaker: number | null }
}

export function readDonorImpact(value: unknown): DonorImpact {
  const record = asRecord(value)
  if (record === null) throw invalidResponseError()
  const rating = asRecord(record.averageRating) ?? {}
  return {
    completedMeetings: integer(record, 'completedMeetings'),
    distinctClasses: integer(record, 'distinctClasses'),
    distinctSchools: integer(record, 'distinctSchools'),
    distinctSpeakers: integer(record, 'distinctSpeakers'),
    studentsReached: integer(record, 'studentsReached'),
    publishedFeedbacks: integer(record, 'publishedFeedbacksCount'),
    rating: { overall: number(rating, 'overall'), school: number(rating, 'school'), speaker: number(rating, 'speaker') },
  }
}

/** Un appel par période affichée ; revenir à une période déjà vue ne refait aucun appel. */
export function useDonorImpact(period: Period) {
  const query = periodQuery(period)
  return useQuery({
    ...COUNTED,
    queryKey: ['donor', 'impact', query.from, query.to],
    queryFn: async () => readDonorImpact(await unwrap(api.GET('/api/donor/impact', { params: { query } }))),
  })
}

// ——— Retours publiés ———

const AUTHOR_ROLES = ['SCHOOL', 'SPEAKER'] as const
export type AuthorRole = (typeof AUTHOR_ROLES)[number]

export interface DonorFeedback {
  id: string
  authorRole: AuthorRole
  rating: number | null
  comment: string | null
  publishedAt: string | null
  meetingStartAt: string | null
  schoolCity: string
  schoolCountry: string
}

export function readDonorFeedback(value: unknown): DonorFeedback | null {
  const record = asRecord(value)
  if (record === null) return null
  const id = text(record, 'id')
  const authorRole = oneOf(AUTHOR_ROLES, text(record, 'authorRole'))
  if (id === null || authorRole === null) return null
  const rating = integer(record, 'rating')
  return {
    id,
    authorRole,
    rating: rating !== null && rating >= 1 && rating <= 5 ? rating : null,
    comment: typeof record.comment === 'string' ? record.comment : null,
    publishedAt: text(record, 'publishedAt'),
    meetingStartAt: text(record, 'meetingStartAt'),
    schoolCity: text(record, 'schoolCity') ?? '',
    schoolCountry: text(record, 'schoolCountry') ?? '',
  }
}

/**
 * Retours publiés des rencontres de la période, toutes les pages, sans filtre de rôle (le filtre « Tous / Écoles /
 * Intervenants » est appliqué côté client) : une seule page 0, donc une seule consultation, par période.
 */
export function useDonorFeedbacks(period: Period) {
  const query = periodQuery(period)
  return useQuery({
    ...COUNTED,
    queryKey: ['donor', 'feedbacks', query.from, query.to],
    queryFn: () =>
      fetchAllPages(
        (page) => unwrap(api.GET('/api/donor/feedbacks', { params: { query: { ...query, page, size: FETCH_PAGE_SIZE } } })),
        readDonorFeedback,
      ),
  })
}

// ——— Requêtes ———

const REQUEST_STATUSES = ['OPEN', 'ANSWERED'] as const

export interface DonorRequest {
  id: string
  subject: string
  message: string
  status: (typeof REQUEST_STATUSES)[number]
  response: string | null
  createdAt: string | null
  answeredAt: string | null
}

export function readDonorRequest(value: unknown): DonorRequest | null {
  const record = asRecord(value)
  if (record === null) return null
  const id = text(record, 'id')
  const status = oneOf(REQUEST_STATUSES, text(record, 'status'))
  if (id === null || status === null) return null
  return {
    id,
    subject: text(record, 'subject') ?? 'Sans objet',
    message: typeof record.message === 'string' ? record.message : '',
    status,
    response: text(record, 'response'),
    createdAt: text(record, 'createdAt'),
    answeredAt: text(record, 'answeredAt'),
  }
}

export const DONOR_REQUESTS_KEY = ['donor', 'requests'] as const

const myRequestsQuery = queryOptions({
  queryKey: DONOR_REQUESTS_KEY,
  queryFn: () =>
    fetchAllPages(
      (page) => unwrap(api.GET('/api/donor/requests', { params: { query: { page, size: FETCH_PAGE_SIZE } } })),
      readDonorRequest,
    ),
})

/** Toutes les requêtes du donateur (page et pastille de navigation partagent la requête). */
export function useMyDonorRequests(enabled = true) {
  return useQuery({ ...myRequestsQuery, enabled })
}

/** Pastille « Mes requêtes » : requêtes OPEN. */
export function useOpenMyRequestCount(enabled: boolean): number | undefined {
  const requests = useMyDonorRequests(enabled)
  return requests.data?.items.filter((request) => request.status === 'OPEN').length
}

export interface NewDonorRequest {
  subject: string
  message: string
}

/**
 * Envoi d'une requête. La requête renvoyée est ajoutée à la liste en attendant le rechargement (non attendu). Pas de
 * nouvelle tentative : en cas d'échec, la page décide (décision 104).
 */
export function useSendDonorRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: NewDonorRequest) => {
      const created = readDonorRequest(await unwrap(api.POST('/api/donor/requests', { body })))
      if (created === null) throw invalidResponseError()
      return created
    },
    onSuccess: (created) => {
      queryClient.setQueryData<Collection<DonorRequest>>(DONOR_REQUESTS_KEY, (current) =>
        current === undefined || current.items.some((request) => request.id === created.id)
          ? current
          : { ...current, items: [created, ...current.items] },
      )
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: DONOR_REQUESTS_KEY })
    },
  })
}

/** Relecture de la liste après un échec d'envoi (doublon possible si la réponse s'est perdue). */
export function useRefetchMyRequests() {
  const queryClient = useQueryClient()
  return () => queryClient.fetchQuery({ ...myRequestsQuery, staleTime: 0 })
}
