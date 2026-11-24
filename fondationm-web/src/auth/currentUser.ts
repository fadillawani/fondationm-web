import { invalidResponseError } from '../api/errors'
import type { components } from '../api/schema'
import { SCHOOL_TYPES, SECTORS, type SchoolType, type Sector } from '../lib/referenceData'

type MeResponse = components['schemas']['MeResponse']

export type Role = NonNullable<MeResponse['role']>
export type AccountStatus = NonNullable<MeResponse['status']>

const ROLES = ['SCHOOL', 'SPEAKER', 'FOUNDATION', 'DONOR', 'STUDENT'] as const satisfies readonly Role[]
const STATUSES = ['PENDING', 'VALIDATED', 'REJECTED'] as const satisfies readonly AccountStatus[]

export interface SchoolDetails {
  kind: 'school'
  schoolName: string
  schoolType: SchoolType | null
  city: string
  country: string
  referentRole: string
  phone: string
}

export interface SpeakerDetails {
  kind: 'speaker'
  fullName: string
  jobTitle: string
  organization: string
  sector: Sector | null
  city: string
  country: string
  phone: string
  skills: string[]
}

export interface CurrentUser {
  id: string
  email: string
  role: Role
  status: AccountStatus
  rejectionReason: string | null
  mustChangePassword: boolean
  createdAt: string | null
  displayName: string
  details: SchoolDetails | SpeakerDetails | null
}

/*
 * La réponse de GET /api/me est lue comme une donnée non fiable : le backend envoie des `null`
 * explicites (`profile: null` pour la Fondation, `rejectionReason: null` hors refus…) alors que le
 * contrat déclare ces champs « absents ». Toute valeur null, absente ou d'un type inattendu est traitée
 * comme absente ; seuls id, role et status sont indispensables.
 */
type WireRecord = Record<string, unknown>

function asRecord(value: unknown): WireRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as WireRecord) : null
}

function text(record: WireRecord, key: string): string | null {
  const value = record[key]
  return typeof value === 'string' && value !== '' ? value : null
}

function oneOf<T extends string>(allowed: readonly T[], value: string | null): T | null {
  return allowed.find((item) => item === value) ?? null
}

function textList(record: WireRecord, key: string): string[] {
  const value = record[key]
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item !== '') : []
}

function displayNameOf(profile: WireRecord | null, email: string): string {
  if (profile !== null) {
    const name =
      text(profile, 'schoolName') ??
      text(profile, 'fullName') ??
      ([text(profile, 'firstName'), text(profile, 'lastName')].filter(Boolean).join(' ') || null) ??
      text(profile, 'name')
    if (name !== null) return name
  }
  return email
}

function detailsOf(role: Role, profile: WireRecord | null): SchoolDetails | SpeakerDetails | null {
  if (profile === null) return null
  if (role === 'SCHOOL') {
    return {
      kind: 'school',
      schoolName: text(profile, 'schoolName') ?? '',
      schoolType: oneOf(SCHOOL_TYPES, text(profile, 'schoolType')),
      city: text(profile, 'city') ?? '',
      country: text(profile, 'country') ?? '',
      referentRole: text(profile, 'referentRole') ?? '',
      phone: text(profile, 'phone') ?? '',
    }
  }
  if (role === 'SPEAKER') {
    return {
      kind: 'speaker',
      fullName: text(profile, 'fullName') ?? '',
      jobTitle: text(profile, 'jobTitle') ?? '',
      organization: text(profile, 'organization') ?? '',
      sector: oneOf(SECTORS, text(profile, 'sector')),
      city: text(profile, 'city') ?? '',
      country: text(profile, 'country') ?? '',
      phone: text(profile, 'phone') ?? '',
      skills: textList(profile, 'skills'),
    }
  }
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
    displayName: displayNameOf(profile, email),
    details: detailsOf(role, profile),
  }
}

export function greetingName(user: CurrentUser): string {
  if (user.role === 'SCHOOL') return user.displayName
  return user.displayName.split(/\s+/)[0] ?? user.displayName
}
