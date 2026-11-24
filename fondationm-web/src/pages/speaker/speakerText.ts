import { formatCompactDay, formatSlot, formatTime, parseIso } from '../../lib/dateTime'
import { ONLINE_MEETINGS_ENABLED } from '../../lib/features'
import type { Meeting, MeetingFormat, MeetingStatus, SlotFormats } from './speakerData'

/** Un créneau BOTH se fait en classe tant que les rencontres en ligne sont désactivées ; ONLINE hérité : « En ligne ». */
export const SLOT_FORMAT_LABEL: Record<SlotFormats, string> = {
  IN_PERSON: 'En classe',
  ONLINE: 'En ligne',
  BOTH: ONLINE_MEETINGS_ENABLED ? 'En classe ou en ligne' : 'En classe',
}

export const SLOT_FORMAT_DETAIL: Record<SlotFormats, string> = SLOT_FORMAT_LABEL

export const MEETING_FORMAT_LABEL: Record<MeetingFormat, string> = {
  IN_PERSON: 'En classe',
  ONLINE: 'En ligne',
}

type RequestTone = 'orange' | 'success' | 'danger' | 'neutral' | 'warning' | 'muted'

export const MEETING_STATUS_BADGE: Record<MeetingStatus, { label: string; tone: RequestTone }> = {
  PENDING: { label: 'À traiter', tone: 'warning' },
  CONFIRMED: { label: 'Confirmée', tone: 'success' },
  COMPLETED: { label: 'Réalisée', tone: 'neutral' },
  REFUSED: { label: 'Refusée', tone: 'danger' },
  CANCELLED: { label: 'Annulée', tone: 'muted' },
}

/** Badge d'une demande, du point de vue de l'intervenant. */
/** Pastille d'une demande (maquette W2-E9 : À traiter jaune, Acceptée verte, Refusée rouge, créneau pris beige). */
export function requestBadge(meeting: Meeting): { label: string; tone: RequestTone } {
  if (meeting.status === 'PENDING' && meeting.myDecision === 'VALIDATED') return { label: 'Acceptée', tone: 'success' }
  if (meeting.status === 'REFUSED' && meeting.closedBy === 'SYSTEM') return { label: 'Refusée · créneau pris', tone: 'muted' }
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
  return start ? `${formatCompactDay(start)} · ${formatTime(start)}` : 'Créneau inconnu'
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
