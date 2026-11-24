import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '../../api/client'
import { errorFromException, invalidResponseError } from '../../api/errors'
import { asRecord, integer, oneOf, recordList, text, type WireRecord } from '../../api/wire'
import { STATUSES, type AccountStatus } from '../../auth/currentUser'
import { profileName, readSchoolDetails, readSpeakerDetails, type ProfileDetails } from '../../lib/profiles'

/** Rôles des comptes qui demandent à rejoindre le programme (seuls affichés dans cet écran). */
export type RequestRole = 'SCHOOL' | 'SPEAKER'
const REQUEST_ROLES = ['SCHOOL', 'SPEAKER'] as const satisfies readonly RequestRole[]

export const PAGE_SIZE = 20

export interface Account {
  id: string
  email: string
  role: RequestRole
  status: AccountStatus
  rejectionReason: string | null
  createdAt: string | null
  decidedAt: string | null
  name: string
  details: ProfileDetails | null
}

export interface AccountPage {
  items: Account[]
  page: number
  totalPages: number
  totalElements: number
}

export interface AccountFilter {
  role: RequestRole
  status: AccountStatus
  page: number
}

function detailsOf(role: RequestRole, profile: WireRecord | null): ProfileDetails | null {
  if (profile === null) return null
  return role === 'SCHOOL' ? readSchoolDetails(profile) : readSpeakerDetails(profile)
}

/** Lit un AccountResponse ; null si id, rôle de demande ou statut manquent. */
export function readAccount(value: unknown): Account | null {
  const record = asRecord(value)
  if (record === null) return null
  const id = text(record, 'id')
  const role = oneOf(REQUEST_ROLES, text(record, 'role'))
  const status = oneOf(STATUSES, text(record, 'status'))
  if (id === null || role === null || status === null) return null
  const email = text(record, 'email') ?? ''
  const profile = asRecord(record.profile)
  return {
    id,
    email,
    role,
    status,
    rejectionReason: text(record, 'rejectionReason'),
    createdAt: text(record, 'createdAt'),
    decidedAt: text(record, 'decidedAt'),
    name: profileName(profile) ?? email,
    details: detailsOf(role, profile),
  }
}

export function readAccountPage(value: unknown): AccountPage {
  const record = asRecord(value)
  if (record === null) throw invalidResponseError()
  const items = recordList(record, 'content').flatMap((item) => readAccount(item) ?? [])
  const totalElements = integer(record, 'totalElements') ?? items.length
  const size = integer(record, 'size') || PAGE_SIZE
  return {
    items,
    page: integer(record, 'page') ?? 0,
    totalPages: integer(record, 'totalPages') ?? Math.ceil(totalElements / size),
    totalElements,
  }
}

const ACCOUNTS_KEY = ['foundation', 'accounts'] as const

export function accountsQuery({ role, status, page }: AccountFilter) {
  return queryOptions({
    queryKey: [...ACCOUNTS_KEY, role, status, page],
    queryFn: async (): Promise<AccountPage> =>
      readAccountPage(
        await unwrap(
          api.GET('/api/foundation/accounts', { params: { query: { role, status, page, size: PAGE_SIZE } } }),
        ),
      ),
  })
}

export function useAccounts(filter: AccountFilter) {
  return useQuery(accountsQuery(filter))
}

/** Nombre de comptes en attente par rôle (première page, partagée avec la liste). */
export function usePendingCounts(enabled = true): Record<RequestRole, number | undefined> {
  const school = useQuery({ ...accountsQuery({ role: 'SCHOOL', status: 'PENDING', page: 0 }), enabled })
  const speaker = useQuery({ ...accountsQuery({ role: 'SPEAKER', status: 'PENDING', page: 0 }), enabled })
  return { SCHOOL: school.data?.totalElements, SPEAKER: speaker.data?.totalElements }
}

export function usePendingTotal(enabled: boolean): number | undefined {
  const counts = usePendingCounts(enabled)
  return counts.SCHOOL === undefined || counts.SPEAKER === undefined ? undefined : counts.SCHOOL + counts.SPEAKER
}

/** Un 409 sur la validation ou le refus : compte déjà traité (INVALID_STATUS_TRANSITION). */
export function isAlreadyProcessed(error: unknown): boolean {
  return errorFromException(error).status === 409
}

function useAccountMutation<T>(action: (variables: T) => Promise<unknown>) {
  const queryClient = useQueryClient()
  const refresh = () => queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY })
  return useMutation({
    // Le compte renvoyé (null s'il est illisible : l'action a tout de même réussi).
    mutationFn: async (variables: T): Promise<Account | null> => readAccount(await action(variables)),
    onSuccess: refresh,
    onError: (error) => {
      if (isAlreadyProcessed(error)) void refresh()
    },
  })
}

export function useValidateAccount() {
  return useAccountMutation((id: string) =>
    unwrap(api.POST('/api/foundation/accounts/{id}/validate', { params: { path: { id } } })),
  )
}

export function useRejectAccount() {
  return useAccountMutation(({ id, reason }: { id: string; reason: string }) =>
    unwrap(api.POST('/api/foundation/accounts/{id}/reject', { params: { path: { id } }, body: { reason } })),
  )
}
