import { invalidResponseError } from '../api/errors'
import type { components } from '../api/schema'
import type { SchoolType, Sector } from '../lib/referenceData'

type MeResponse = components['schemas']['MeResponse']
type Profile = NonNullable<MeResponse['profile']>

export type Role = NonNullable<MeResponse['role']>
export type AccountStatus = NonNullable<MeResponse['status']>

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

function displayNameOf(me: MeResponse): string {
  const profile = me.profile
  if (profile !== undefined) {
    if ('schoolName' in profile && profile.schoolName) return profile.schoolName
    if ('fullName' in profile && profile.fullName) return profile.fullName
    if ('firstName' in profile || 'lastName' in profile) {
      const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ')
      if (name) return name
    }
    if ('name' in profile && profile.name) return profile.name
  }
  return me.email ?? ''
}

function detailsOf(role: Role, profile: Profile | undefined): SchoolDetails | SpeakerDetails | null {
  if (profile === undefined) return null
  if (role === 'SCHOOL' && 'schoolName' in profile) {
    return {
      kind: 'school',
      schoolName: profile.schoolName ?? '',
      schoolType: profile.schoolType ?? null,
      city: profile.city ?? '',
      country: profile.country ?? '',
      referentRole: profile.referentRole ?? '',
      phone: profile.phone ?? '',
    }
  }
  if (role === 'SPEAKER' && 'fullName' in profile) {
    return {
      kind: 'speaker',
      fullName: profile.fullName ?? '',
      jobTitle: profile.jobTitle ?? '',
      organization: profile.organization ?? '',
      sector: profile.sector ?? null,
      city: profile.city ?? '',
      country: profile.country ?? '',
      phone: profile.phone ?? '',
      skills: profile.skills ?? [],
    }
  }
  return null
}

export function toCurrentUser(me: MeResponse | undefined): CurrentUser {
  if (me?.id === undefined || me.role === undefined || me.status === undefined) {
    throw invalidResponseError()
  }
  return {
    id: me.id,
    email: me.email ?? '',
    role: me.role,
    status: me.status,
    rejectionReason: me.rejectionReason ?? null,
    mustChangePassword: me.mustChangePassword === true,
    createdAt: me.createdAt ?? null,
    displayName: displayNameOf(me),
    details: detailsOf(me.role, me.profile),
  }
}

export function greetingName(user: CurrentUser): string {
  if (user.role === 'SCHOOL') return user.displayName
  return user.displayName.split(/\s+/)[0] ?? user.displayName
}
