import { invalidResponseError } from '../api/errors'
import type { components } from '../api/schema'
import { asRecord, oneOf, text, type WireRecord } from '../api/wire'
import { profileName, readSchoolDetails, readSpeakerDetails, readStudentDetails, type UserDetails } from '../lib/profiles'

export type { SchoolDetails, SpeakerDetails } from '../lib/profiles'

type MeResponse = components['schemas']['MeResponse']

export type Role = NonNullable<MeResponse['role']>
export type AccountStatus = NonNullable<MeResponse['status']>

export const ROLES = ['SCHOOL', 'SPEAKER', 'FOUNDATION', 'DONOR', 'STUDENT'] as const satisfies readonly Role[]
export const STATUSES = ['PENDING', 'VALIDATED', 'REJECTED'] as const satisfies readonly AccountStatus[]

export interface CurrentUser {
  id: string
  email: string
  role: Role
  status: AccountStatus
  rejectionReason: string | null
  mustChangePassword: boolean
  createdAt: string | null
  displayName: string
  details: UserDetails | null
}

/*
 * La réponse de GET /api/me est lue comme une donnée non fiable (voir api/wire.ts) : le backend envoie
 * `profile: null` pour la Fondation, `rejectionReason: null` hors refus… Seuls id, role et status sont
 * indispensables.
 */
function detailsOf(role: Role, profile: WireRecord | null): UserDetails | null {
  if (profile === null) return null
  if (role === 'SCHOOL') return readSchoolDetails(profile)
  if (role === 'SPEAKER') return readSpeakerDetails(profile)
  if (role === 'STUDENT') return readStudentDetails(profile)
  return null
}

export function toCurrentUser(me: unknown): CurrentUser {
  const record = asRecord(me)
  const id = record === null ? null : text(record, 'id')
  const role = record === null ? null : oneOf(ROLES, text(record, 'role'))
  const status = record === null ? null : oneOf(STATUSES, text(record, 'status'))
  if (record === null || id === null || role === null || status === null) {
    throw invalidResponseError()
  }
  const email = text(record, 'email') ?? ''
  const profile = asRecord(record.profile)
  return {
    id,
    email,
    role,
    status,
    rejectionReason: text(record, 'rejectionReason'),
    mustChangePassword: record.mustChangePassword === true,
    createdAt: text(record, 'createdAt'),
    displayName: profileName(profile) ?? email,
    details: detailsOf(role, profile),
  }
}

export function greetingName(user: CurrentUser): string {
  if (user.role === 'SCHOOL') return user.displayName
  return user.displayName.split(/\s+/)[0] ?? user.displayName
}
