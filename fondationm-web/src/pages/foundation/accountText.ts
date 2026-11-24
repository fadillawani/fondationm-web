import type { AccountStatus } from '../../auth/currentUser'
import { SCHOOL_TYPE_LABELS, SECTOR_LABELS } from '../../lib/referenceData'
import type { Account } from './accounts'

export const STATUS_BADGE: Record<AccountStatus, { label: string; tone: 'orange' | 'success' | 'danger' }> = {
  PENDING: { label: 'En attente', tone: 'orange' },
  VALIDATED: { label: 'Validé', tone: 'success' },
  REJECTED: { label: 'Refusé', tone: 'danger' },
}

export function kindLabel(account: Account): string {
  return account.role === 'SCHOOL' ? 'Établissement' : 'Intervenant'
}

function joinPresent(values: readonly (string | null | undefined)[]): string {
  return values.filter((value): value is string => Boolean(value)).join(' · ')
}

/** Ligne de liste (maquette) : école → « ville · type » ; intervenant → « zone · 2 compétences ». */
export function contextLine(account: Account): string {
  const details = account.details
  if (details?.kind === 'school') {
    return joinPresent([details.city, details.schoolType ? SCHOOL_TYPE_LABELS[details.schoolType] : null])
  }
  if (details?.kind === 'speaker') {
    return joinPresent([details.city, details.skills.slice(0, 2).join(', ') || null])
  }
  return ''
}

/** Sous-titre du détail (maquette) : école → « Lycée · Ville, Pays » ; intervenant → « Métier · Structure ». */
export function detailLine(account: Account): string {
  const details = account.details
  if (details?.kind === 'school') {
    const place = [details.city, details.country].filter(Boolean).join(', ')
    return joinPresent([details.schoolType ? SCHOOL_TYPE_LABELS[details.schoolType] : null, place || null])
  }
  if (details?.kind === 'speaker') {
    const where = details.organization || (details.sector ? SECTOR_LABELS[details.sector].name : null)
    return joinPresent([details.jobTitle, where])
  }
  return ''
}
