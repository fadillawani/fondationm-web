import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '../../../api/client'
import { invalidResponseError } from '../../../api/errors'
import { FETCH_PAGE_SIZE, fetchAllPages } from '../../../api/paging'
import { asRecord, integer, oneOf, text } from '../../../api/wire'
import { generateAccessCode } from '../../../lib/accessCode'

const STATUSES = ['OPEN', 'ANSWERED'] as const
export type DonorRequestStatus = (typeof STATUSES)[number]

/** Requête d'un donateur : un message et, au plus, une réponse de la Fondation (pas de fil). */
export interface DonorRequest {
  id: string
  donorName: string
  subject: string
  message: string
  status: DonorRequestStatus
  response: string | null
  createdAt: string | null
  answeredAt: string | null
}

export function readDonorRequest(value: unknown): DonorRequest | null {
  const record = asRecord(value)
  if (record === null) return null
  const id = text(record, 'id')
  const status = oneOf(STATUSES, text(record, 'status'))
  if (id === null || status === null) return null
  const donor = asRecord(record.donor)
  return {
    id,
    donorName: (donor && text(donor, 'name')) ?? 'Donateur',
    subject: text(record, 'subject') ?? 'Sans objet',
    message: text(record, 'message') ?? '',
    status,
    response: text(record, 'response'),
    createdAt: text(record, 'createdAt'),
    answeredAt: text(record, 'answeredAt'),
  }
}

export const DONOR_REQUESTS_KEY = ['foundation', 'requetes-donateurs'] as const

/** Toutes les requêtes (`size=100`, 25 pages au plus) : liste, pastille de navigation et carte « À faire ». */
export function useDonorRequests(enabled = true) {
  return useQuery({
    queryKey: DONOR_REQUESTS_KEY,
    enabled,
    queryFn: () =>
      fetchAllPages(
        (page) => unwrap(api.GET('/api/foundation/donor-requests', { params: { query: { page, size: FETCH_PAGE_SIZE } } })),
        readDonorRequest,
      ),
  })
}

/** Répondre : la requête passe ANSWERED, sans retour possible. */
export function useAnswerDonorRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, response }: { id: string; response: string }) => {
      const updated = readDonorRequest(
        await unwrap(api.POST('/api/foundation/donor-requests/{id}/answer', { params: { path: { id } }, body: { response } })),
      )
      if (updated === null) throw invalidResponseError()
      return updated
    },
    // Rechargement non attendu : la réponse s'affiche avant la liste rechargée (décision 79).
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: DONOR_REQUESTS_KEY })
      void queryClient.invalidateQueries({ queryKey: ['foundation', 'indicateurs'] })
    },
  })
}

/** Donateur listé : consultations (liste principale) et e-mail si l'identifiant correspond à un compte. */
export interface Donor {
  id: string
  name: string
  email: string | null
  lastConsultedAt: string | null
  consultationCount: number
}

export const DONORS_KEY = ['foundation', 'donateurs'] as const

/**
 * `GET /api/foundation/donor-consultations` (ordre du serveur) complété de l'e-mail de `GET /api/foundation/donors`,
 * seulement quand `donorId` est l'identifiant d'un compte (non garanti par le contrat : e-mail omis sinon).
 */
export function useDonors() {
  return useQuery({
    queryKey: DONORS_KEY,
    queryFn: async () => {
      const [consultations, accounts] = await Promise.all([
        fetchAllPages(
          (page) => unwrap(api.GET('/api/foundation/donor-consultations', { params: { query: { page, size: FETCH_PAGE_SIZE } } })),
          (value) => {
            const record = asRecord(value)
            const id = record ? text(record, 'donorId') : null
            if (record === null || id === null) return null
            return {
              id,
              name: text(record, 'name') ?? 'Donateur',
              lastConsultedAt: text(record, 'lastConsultedAt'),
              consultationCount: integer(record, 'consultationCount') ?? 0,
            }
          },
        ),
        fetchAllPages(
          (page) => unwrap(api.GET('/api/foundation/donors', { params: { query: { page, size: FETCH_PAGE_SIZE } } })),
          (value) => {
            const record = asRecord(value)
            const id = record ? text(record, 'id') : null
            return record === null || id === null ? null : { id, email: text(record, 'email') }
          },
        ),
      ])
      const emails = new Map(accounts.items.map((account) => [account.id, account.email]))
      const items: Donor[] = consultations.items.map((entry) => ({ ...entry, email: emails.get(entry.id) ?? null }))
      return { items, truncated: consultations.truncated }
    },
  })
}

export interface DonorAccess {
  id: string
  name: string
  email: string
  /** Code en clair : gardé dans l'état de la page seulement, jamais dans le cache des requêtes. */
  code: string
}

/** Crée le compte donateur avec un code d'accès temporaire (hors TanStack Query : le code ne passe pas par le cache). */
export async function createDonorAccount(name: string, email: string): Promise<DonorAccess> {
  const code = generateAccessCode()
  const created = asRecord(await unwrap(api.POST('/api/foundation/donors', { body: { name, email, password: code } })))
  const id = created ? text(created, 'id') : null
  if (created === null || id === null) throw invalidResponseError()
  return { id, name, email: text(created, 'email') ?? email, code }
}

/** Nouveau code : l'ancien cesse aussitôt de fonctionner (`POST /api/foundation/accounts/{id}/password`). */
export async function renewDonorCode(donor: Pick<Donor, 'id' | 'name' | 'email'>): Promise<DonorAccess> {
  const code = generateAccessCode()
  await unwrap(api.POST('/api/foundation/accounts/{id}/password', { params: { path: { id: donor.id } }, body: { newPassword: code } }))
  return { id: donor.id, name: donor.name, email: donor.email ?? '', code }
}
