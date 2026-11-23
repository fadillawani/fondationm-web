import { invalidResponseError } from '../api/errors'
import type { components } from '../api/schema'

type MeResponse = components['schemas']['MeResponse']

export type Role = NonNullable<MeResponse['role']>
export type AccountStatus = NonNullable<MeResponse['status']>

export interface CurrentUser {
  id: string
  email: string
  role: Role
  status: AccountStatus
  rejectionReason: string | null
  mustChangePassword: boolean
  displayName: string
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
    displayName: displayNameOf(me),
  }
}
