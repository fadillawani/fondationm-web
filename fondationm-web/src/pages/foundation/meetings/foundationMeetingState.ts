import { errorFromException, errorMessage } from '../../../api/errors'
import { dayKey, formatDayMonth, formatDayWithYear, parseIso, startOfDay } from '../../../lib/dateTime'
import { clock, firstName } from '../../school/meetingText'
import type { FeedbackState, FoundationMeeting, PartyDecision } from './foundationMeetingsData'

// ——— États calculés (une seule source pour les onglets, les pastilles de navigation et le bandeau) ———

/** « À traiter » : PENDING et avis de la Fondation PENDING (`awaitingFoundation` n'est pas utilisé). */
export function isAwaitingFoundation(meeting: FoundationMeeting): boolean {
  return meeting.status === 'PENDING' && meeting.foundationDecision === 'PENDING'
}

function endOf(meeting: FoundationMeeting): Date | null {
  return parseIso(meeting.endAt) ?? parseIso(meeting.startAt)
}

/** « À marquer » : CONFIRMED dont la fin du créneau est passée. */
export function isToMark(meeting: FoundationMeeting, now: Date): boolean {
  const end = endOf(meeting)
  return meeting.status === 'CONFIRMED' && end !== null && end.getTime() <= now.getTime()
}

export type RequestTab = 'a-traiter' | 'confirmees' | 'refusees' | 'toutes'
export const REQUEST_TABS: readonly RequestTab[] = ['a-traiter', 'confirmees', 'refusees', 'toutes']

export function inRequestTab(meeting: FoundationMeeting, tab: RequestTab): boolean {
  switch (tab) {
    case 'a-traiter':
      return isAwaitingFoundation(meeting)
    case 'confirmees':
      return meeting.status === 'CONFIRMED' || meeting.status === 'COMPLETED'
    case 'refusees':
      return meeting.status === 'REFUSED' || meeting.status === 'CANCELLED'
    case 'toutes':
      return true
  }
}

function startTime(meeting: FoundationMeeting): number {
  return parseIso(meeting.startAt)?.getTime() ?? 0
}

/** Ordre des demandes : par date du créneau. */
export function byStart(a: FoundationMeeting, b: FoundationMeeting): number {
  return startTime(a) - startTime(b)
}

/** Autres demandes PENDING sur le même créneau (`slot.id`). */
export function slotConflicts(meeting: FoundationMeeting, all: readonly FoundationMeeting[]): FoundationMeeting[] {
  if (meeting.slotId === null) return []
  return all.filter((other) => other.id !== meeting.id && other.status === 'PENDING' && other.slotId === meeting.slotId)
}

/** Jours de calendrier écoulés depuis l'envoi (demande PENDING), sinon null. */
export function waitingDays(meeting: FoundationMeeting, now: Date): number | null {
  const created = parseIso(meeting.createdAt)
  if (meeting.status !== 'PENDING' || created === null) return null
  return Math.round((startOfDay(now).getTime() - startOfDay(created).getTime()) / 86_400_000)
}

/** « En attente depuis » affiché à partir de 2 jours (maquette). */
export const LATE_AFTER_DAYS = 2

// ——— Libellés et couleurs (maquettes W3-demandes, W3-rencontres ; contrastes : décision 75) ———

export function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count > 1 ? pluralForm : singular}`
}

export interface Look {
  label: string
  className: string
}

export function requestBadge(meeting: FoundationMeeting): Look {
  switch (meeting.status) {
    case 'PENDING':
      return { label: 'En attente', className: 'bg-orange text-ink' }
    case 'CONFIRMED':
      return { label: 'Confirmée', className: 'bg-green text-white' }
    case 'COMPLETED':
      return { label: 'Réalisée', className: 'bg-indigo text-cream' }
    case 'REFUSED':
      return meeting.closedBy === 'SYSTEM'
        ? { label: 'Créneau pris', className: 'bg-line text-ink' }
        : { label: 'Refusée', className: 'bg-red text-white' }
    case 'CANCELLED':
      return { label: 'Annulée', className: 'bg-line text-muted' }
  }
}

const DECISION_LOOK: Record<PartyDecision, { label: string; text: string; box: string }> = {
  PENDING: { label: 'À traiter', text: 'text-[#7A4100]', box: 'bg-[#FDEBD3]' },
  VALIDATED: { label: 'Validé', text: 'text-[#3B5221]', box: 'bg-[#E8EEDF]' },
  REFUSED: { label: 'Refusé', text: 'text-[#8E1518]', box: 'bg-[#FBE3E3]' },
}

export function decisionLook(decision: PartyDecision | null): { label: string; text: string; box: string } {
  return decision === null ? { label: '—', text: 'text-muted', box: 'bg-canvas' } : DECISION_LOOK[decision]
}

/** « Mar 24 nov · 10h00 » (liste). */
export function slotShort(meeting: FoundationMeeting): string {
  const start = parseIso(meeting.startAt)
  if (start === null) return ''
  const weekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(start).replace('.', '')
  const month = new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(start).replace('.', '')
  return `${weekday.charAt(0).toLocaleUpperCase('fr-FR')}${weekday.slice(1)} ${start.getDate()} ${month} · ${clock(start)}`
}

/** « Mardi 24 novembre, 10h00 – 11h30 ». */
export function slotLong(meeting: FoundationMeeting): string {
  const start = parseIso(meeting.startAt)
  const end = parseIso(meeting.endAt)
  if (start === null) return ''
  const day = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(start)
  const label = day.charAt(0).toLocaleUpperCase('fr-FR') + day.slice(1)
  return end ? `${label}, ${clock(start)} – ${clock(end)}` : `${label}, ${clock(start)}`
}

/** « 12 novembre » (date d'envoi, sans l'année). */
export function sentOn(meeting: FoundationMeeting): string | null {
  const created = parseIso(meeting.createdAt)
  return created ? formatDayMonth(created) : null
}

export function classLine(meeting: FoundationMeeting): string {
  return meeting.studentCount === null
    ? meeting.classTitle
    : [meeting.classTitle, plural(meeting.studentCount, 'élève', 'élèves')].filter(Boolean).join(' · ')
}

/** « Dakar · Réseaux, Cybersécurité » : le métier est absent de `SpeakerInfo` (écart). */
export function speakerLine(meeting: FoundationMeeting): string {
  return [meeting.speakerCity, meeting.speakerSkills.slice(0, 2).join(', ')].filter(Boolean).join(' · ')
}

/** Mots génériques retirés pour le nom court d'une école (« Lycée de Sor » → « Sor »). */
const GENERIC = new Set([
  'lycee', 'college', 'ecole', 'institut', 'complexe', 'scolaire', 'cours', 'prive', 'privee', 'cem', 'centre',
  'formation', 'de', 'du', 'des', 'la', 'le', 'les', 'l', 'd',
])

function normalize(word: string): string {
  return word.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

/** Nom court d'une école, pour les pastilles du calendrier : premier mot distinctif (écart : aucun champ dédié). */
export function shortSchool(name: string): string {
  const words = name.split(/[\s'’-]+/).filter((word) => word !== '' && !GENERIC.has(normalize(word)))
  return words[0] ?? name
}

// ——— Blocs de résultat (demandes) ———

export interface Outcome {
  title: string
  text: string
  tone: 'success' | 'danger' | 'neutral'
  toCalendar: boolean
}

function motif(meeting: FoundationMeeting, fallback: string): string {
  const reason = meeting.reason?.trim()
  return reason ? `Motif : « ${reason} »` : fallback
}

export function requestOutcome(meeting: FoundationMeeting): Outcome | null {
  switch (meeting.status) {
    case 'PENDING':
      return meeting.foundationDecision === 'VALIDATED'
        ? {
            title: 'Votre validation est enregistrée',
            text: "Il manque l'avis de l'intervenant. La rencontre sera confirmée dès son accord.",
            tone: 'success',
            toCalendar: false,
          }
        : null
    case 'CONFIRMED':
      return {
        title: 'Rencontre confirmée',
        text: "La rencontre apparaît maintenant dans l'espace de l'école et de l'intervenant. Les autres demandes sur ce créneau sont refusées automatiquement.",
        tone: 'success',
        toCalendar: true,
      }
    case 'COMPLETED':
      return {
        title: 'Rencontre réalisée',
        text: "La rencontre a eu lieu. Les retours d'expérience de l'école et de l'intervenant sont ouverts.",
        tone: 'success',
        toCalendar: true,
      }
    case 'REFUSED':
      if (meeting.closedBy === 'SYSTEM') {
        return {
          title: 'Refusée automatiquement · créneau pris',
          text: "Une autre rencontre a été confirmée sur ce créneau. L'école est invitée à choisir une autre date.",
          tone: 'neutral',
          toCalendar: false,
        }
      }
      return {
        title: meeting.closedBy === 'SPEAKER' ? "Refusée par l'intervenant" : 'Refusée par la Fondation M',
        text: motif(meeting, "Aucun motif transmis. L'école peut choisir un autre intervenant."),
        tone: 'danger',
        toCalendar: false,
      }
    case 'CANCELLED':
      return {
        title: meeting.closedBy === 'FOUNDATION' || meeting.closedBy === null ? 'Annulée par la Fondation M' : 'Annulée',
        text: motif(meeting, 'Aucun motif transmis.'),
        tone: 'danger',
        toCalendar: true,
      }
  }
}

// ——— Calendrier (rencontres) ———

/** Une pastille du calendrier : une rencontre, ou plusieurs demandes PENDING sur le même créneau. */
export interface CalendarEntry {
  key: string
  meetings: FoundationMeeting[]
  start: Date
}

export function entryStatusMeeting(entry: CalendarEntry): FoundationMeeting {
  // `meetings` n'est jamais vide.
  return entry.meetings[0] as FoundationMeeting
}

/** Rencontres groupées par jour ; les demandes PENDING d'un même créneau forment une seule pastille. */
export function calendarEntries(meetings: readonly FoundationMeeting[]): Map<string, CalendarEntry[]> {
  const bySlot = new Map<string, CalendarEntry>()
  const entries: CalendarEntry[] = []
  for (const meeting of [...meetings].toSorted(byStart)) {
    const start = parseIso(meeting.startAt)
    if (start === null) continue
    if (meeting.status === 'PENDING' && meeting.slotId !== null) {
      const existing = bySlot.get(meeting.slotId)
      if (existing) {
        existing.meetings.push(meeting)
        continue
      }
      const entry = { key: `creneau-${meeting.slotId}`, meetings: [meeting], start }
      bySlot.set(meeting.slotId, entry)
      entries.push(entry)
      continue
    }
    entries.push({ key: meeting.id, meetings: [meeting], start })
  }
  const days = new Map<string, CalendarEntry[]>()
  for (const entry of entries) {
    const key = dayKey(entry.start)
    days.set(key, [...(days.get(key) ?? []), entry])
  }
  return days
}

export interface MeetingLook {
  label: string
  chip: string
  dot: string
  accent: string
  struck: boolean
}

export function meetingLook(meeting: FoundationMeeting, now: Date): MeetingLook {
  if (isToMark(meeting, now)) {
    return { label: 'À marquer', chip: 'bg-green text-white ring-[3px] ring-inset ring-red', dot: 'bg-green border-2 border-red', accent: 'border-red', struck: false }
  }
  switch (meeting.status) {
    case 'PENDING':
      return { label: 'En attente', chip: 'bg-orange text-ink', dot: 'bg-orange', accent: 'border-orange', struck: false }
    case 'CONFIRMED':
      return { label: 'Confirmée', chip: 'bg-green text-white', dot: 'bg-green', accent: 'border-green', struck: false }
    case 'COMPLETED':
      return { label: 'Réalisée', chip: 'bg-indigo text-cream', dot: 'bg-indigo', accent: 'border-indigo', struck: false }
    case 'REFUSED':
      return { label: meeting.closedBy === 'SYSTEM' ? 'Créneau pris' : 'Refusée', chip: 'bg-line text-muted line-through', dot: 'bg-[#C9BFA8]', accent: 'border-[#B8AE98]', struck: true }
    case 'CANCELLED':
      return { label: 'Annulée', chip: 'bg-line text-muted line-through', dot: 'bg-[#C9BFA8]', accent: 'border-[#B8AE98]', struck: true }
  }
}

/** « 10h00 · Sor × Mame » ou « 10h00 · 2 demandes × Amadou ». */
export function entryText(entry: CalendarEntry): string {
  const first = entryStatusMeeting(entry)
  const who = entry.meetings.length > 1 ? `${entry.meetings.length} demandes` : shortSchool(first.schoolName)
  return `${clock(entry.start)} · ${who} × ${firstName(first.speakerName)}`
}

export function entryAria(entry: CalendarEntry, now: Date): string {
  const first = entryStatusMeeting(entry)
  const look = meetingLook(first, now)
  const who =
    entry.meetings.length > 1
      ? `${entry.meetings.length} demandes (${entry.meetings.map((meeting) => meeting.schoolName).join(', ')})`
      : first.schoolName
  const state = look.label === 'À marquer' ? 'Confirmée, à marquer' : look.label
  return `${formatDayWithYear(entry.start)}, ${clock(entry.start)}, ${who} avec ${first.speakerName}, ${state}`
}

/** Note du panneau (textes de la maquette W3-rencontres). */
export function panelNote(meeting: FoundationMeeting, now: Date, justCompleted: boolean): { text: string; tone: 'alert' | 'success' | 'neutral' } | null {
  if (justCompleted && meeting.status === 'COMPLETED') {
    return { text: "C'est noté ! Les retours d'expérience de l'école et de l'intervenant sont maintenant ouverts.", tone: 'success' }
  }
  if (isToMark(meeting, now)) {
    return {
      text: "La date est passée. La rencontre a-t-elle bien eu lieu ? En la marquant « Réalisée », vous ouvrez les retours de l'école et de l'intervenant.",
      tone: 'alert',
    }
  }
  const reason = meeting.reason?.trim()
  switch (meeting.status) {
    case 'CONFIRMED':
      return { text: "Les deux parties ont validé. Vous pouvez encore l'annuler en cas d'imprévu.", tone: 'neutral' }
    case 'PENDING':
      return { text: "Cette demande attend encore une validation (la vôtre ou celle de l'intervenant).", tone: 'neutral' }
    case 'CANCELLED':
      return { text: `Annulée par la Fondation M${reason ? ` : ${reason}` : '.'}`, tone: 'neutral' }
    case 'REFUSED':
      if (meeting.closedBy === 'SYSTEM') return { text: 'Refusée automatiquement · créneau pris.', tone: 'neutral' }
      return {
        text: `${meeting.closedBy === 'SPEAKER' ? "Refusée par l'intervenant" : 'Refusée par la Fondation M'}${reason ? ` : ${reason}` : '.'}`,
        tone: 'neutral',
      }
    case 'COMPLETED':
      return null
  }
}

export const FEEDBACK_LOOK: Record<FeedbackState, string> = {
  'À rédiger': 'bg-yellow text-ink',
  Soumis: 'bg-[#9DAA3C] text-ink',
  Validé: 'bg-green text-white',
}

/** Sélection par défaut des rencontres : la première « à marquer », sinon la prochaine, sinon la plus récente. */
export function defaultMeeting(meetings: readonly FoundationMeeting[], now: Date): FoundationMeeting | undefined {
  const sorted = [...meetings].toSorted(byStart)
  return (
    sorted.find((meeting) => isToMark(meeting, now)) ??
    sorted.find((meeting) => startTime(meeting) >= now.getTime()) ??
    sorted.at(-1)
  )
}

/** « 17 nov · Sor × Awa » (bandeau). */
export function toMarkLabel(meeting: FoundationMeeting): string {
  const start = parseIso(meeting.startAt)
  const month = start ? new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(start).replace('.', '') : ''
  return `${start ? `${start.getDate()} ${month}` : ''} · ${shortSchool(meeting.schoolName)} × ${firstName(meeting.speakerName)}`
}

/** Codes connus (non documentés, lus dans le corps) ; sinon le message du serveur. */
const ACTION_ERRORS: Partial<Record<string, string>> = {
  INVALID_STATUS_TRANSITION: "Cette rencontre a déjà changé d'état. La liste a été rechargée.",
  SLOT_NOT_AVAILABLE: "Ce créneau n'est plus disponible. La liste a été rechargée.",
  SLOT_PASSED: 'Ce créneau est déjà passé.',
}

export function actionErrorMessage(error: unknown): string {
  return ACTION_ERRORS[errorFromException(error).code] ?? errorMessage(error)
}
