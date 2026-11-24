import { parseIso, formatShortDay, formatSlot, formatTime } from '../../lib/dateTime'
import type { Meeting, MeetingFormat, MeetingStatus, SlotFormats } from './speakerData'

export const SLOT_FORMAT_LABEL: Record<SlotFormats, string> = {
  IN_PERSON: 'En classe',
  ONLINE: 'En ligne',
  BOTH: 'Les deux',
}

export const SLOT_FORMAT_DETAIL: Record<SlotFormats, string> = {
  IN_PERSON: 'En classe',
  ONLINE: 'En ligne',
  BOTH: 'En classe ou en ligne',
}

export const MEETING_FORMAT_LABEL: Record<MeetingFormat, string> = {
  IN_PERSON: 'En classe',
  ONLINE: 'En ligne',
}

export const MEETING_STATUS_BADGE: Record<MeetingStatus, { label: string; tone: 'orange' | 'success' | 'danger' | 'neutral' | 'warning' }> = {
  PENDING: { label: 'En attente', tone: 'orange' },
  CONFIRMED: { label: 'Confirmée', tone: 'neutral' },
  COMPLETED: { label: 'Réalisée', tone: 'success' },
  REFUSED: { label: 'Refusée', tone: 'danger' },
  CANCELLED: { label: 'Annulée', tone: 'danger' },
}

/** Badge d'une demande, du point de vue de l'intervenant. */
export function requestBadge(meeting: Meeting): { label: string; tone: 'orange' | 'success' | 'danger' | 'neutral' | 'warning' } {
  if (meeting.status === 'PENDING' && meeting.myDecision === 'VALIDATED') {
    return { label: 'Acceptée · avis de la Fondation attendu', tone: 'warning' }
  }
  if (meeting.status === 'PENDING') return { label: 'À traiter', tone: 'orange' }
  return MEETING_STATUS_BADGE[meeting.status]
}

export function myAnswerLabel(meeting: Meeting): string {
  if (meeting.myDecision === 'VALIDATED') return 'Vous avez accepté'
  if (meeting.myDecision === 'REFUSED') return 'Vous avez refusé'
  return 'Votre réponse est attendue'
}

/** « refusée par vous / la Fondation M / le système ». */
export function closedByText(meeting: Meeting): string | null {
  const verb = meeting.status === 'CANCELLED' ? 'Annulée' : 'Refusée'
  if (meeting.closedBy === 'SPEAKER') return `${verb} par vous`
  if (meeting.closedBy === 'FOUNDATION') return `${verb} par la Fondation M`
  if (meeting.closedBy === 'SYSTEM') return `${verb} par le système`
  return null
}

export function slotText(meeting: Meeting): string {
  const start = parseIso(meeting.slot?.startAt ?? null)
  const end = parseIso(meeting.slot?.endAt ?? null)
  return start && end ? formatSlot(start, end) : 'Créneau inconnu'
}

export function shortSlotText(meeting: Meeting): string {
  const start = parseIso(meeting.slot?.startAt ?? null)
  return start ? `${formatShortDay(start)}, ${formatTime(start)}` : 'Créneau inconnu'
}

/** « Terminale S2 · 32 élèves · Dakar ». */
export function classLine(meeting: Meeting): string {
  return [
    meeting.classTitle,
    meeting.studentCount === null ? null : `${meeting.studentCount} élève${meeting.studentCount > 1 ? 's' : ''}`,
    meeting.schoolCity,
  ]
    .filter(Boolean)
    .join(' · ')
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLocaleLowerCase('fr-FR')
}

/** Même ville ET même pays que l'intervenant (sans majuscules ni accents), comme la règle de zone du backend. */
export function isInMyZone(meeting: Meeting, me: { city: string; country: string } | null): boolean {
  if (me === null || !me.city || !me.country || !meeting.schoolCity || !meeting.schoolCountry) return false
  return normalize(meeting.schoolCity) === normalize(me.city) && normalize(meeting.schoolCountry) === normalize(me.country)
}

/** Nombre de demandes en attente sur le même créneau (celle-ci comprise). */
export function pendingOnSameSlot(meeting: Meeting, all: readonly Meeting[]): number {
  const slotId = meeting.slot?.id
  if (!slotId) return meeting.status === 'PENDING' ? 1 : 0
  return all.filter((other) => other.slot?.id === slotId && other.status === 'PENDING').length
}
