import { PATHS } from '../../auth/roles'
import { dayKey, parseIso } from '../../lib/dateTime'
import type { FeedbackState, MeetingStatus, SchoolMeeting } from './meetingsData'

/** Statuts de la maquette W1-E5 : fond et texte (contrastes : décision 47). */
export const STATUS_STYLE: Record<MeetingStatus, { label: string; chip: string; dot: string; accent: string }> = {
  PENDING: { label: 'En attente', chip: 'bg-orange text-ink', dot: 'bg-orange', accent: 'border-orange' },
  CONFIRMED: { label: 'Confirmée', chip: 'bg-green text-white', dot: 'bg-green', accent: 'border-green' },
  COMPLETED: { label: 'Réalisée', chip: 'bg-indigo text-cream', dot: 'bg-indigo', accent: 'border-indigo' },
  REFUSED: { label: 'Refusée', chip: 'bg-red text-white', dot: 'bg-red', accent: 'border-red' },
  CANCELLED: { label: 'Annulée', chip: 'bg-line text-ink', dot: 'bg-line', accent: 'border-[#B8AE98]' },
}

/** Ordre de la légende (maquette). */
export const LEGEND: readonly MeetingStatus[] = ['PENDING', 'CONFIRMED', 'COMPLETED', 'REFUSED', 'CANCELLED']

export const FEEDBACK_STYLE: Record<FeedbackState, string> = {
  'À rédiger': 'bg-yellow text-ink',
  Soumis: 'bg-[#9DAA3C] text-ink',
  Validé: 'bg-green text-white',
}

export type Decision = 'Validé' | 'En attente' | 'Refusé' | '—'

export const DECISION_STYLE: Record<Decision, string> = {
  Validé: 'bg-[#E8EEDF] text-[#3B5221]',
  'En attente': 'bg-[#FDEBD3] text-[#7A4100]',
  Refusé: 'bg-red-tint text-[#8E1518]',
  '—': 'bg-canvas text-muted',
}

/**
 * Décisions de l'intervenant et de la Fondation, déduites du statut : le contrat ne les donne pas
 * séparément (écart). PENDING : en attente des deux ; refus : seul l'auteur est connu ; annulée : validée
 * des deux côtés seulement si elle avait été confirmée.
 */
export function decisions(meeting: SchoolMeeting): { speaker: Decision; foundation: Decision } {
  switch (meeting.status) {
    case 'PENDING':
      return { speaker: 'En attente', foundation: 'En attente' }
    case 'CONFIRMED':
    case 'COMPLETED':
      return { speaker: 'Validé', foundation: 'Validé' }
    case 'REFUSED':
      if (meeting.closedBy === 'SPEAKER') return { speaker: 'Refusé', foundation: '—' }
      if (meeting.closedBy === 'FOUNDATION') return { speaker: '—', foundation: 'Refusé' }
      return { speaker: '—', foundation: '—' }
    case 'CANCELLED':
      return meeting.confirmedAt ? { speaker: 'Validé', foundation: 'Validé' } : { speaker: '—', foundation: '—' }
  }
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName
}

export interface MeetingNote {
  title: string
  text: string
  /** Texte court du mobile (maquette), s'il diffère. */
  mobileText?: string
  cta?: { label: string; to: string | null }
}

/** Bloc de message du détail (textes de la maquette W1-E5 ; deux cas absents validés). */
export function meetingNote(meeting: SchoolMeeting, feedback: FeedbackState | undefined): MeetingNote {
  const prenom = firstName(meeting.speakerName)
  switch (meeting.status) {
    case 'CONFIRMED':
      return {
        title: 'Tout est prêt',
        text: `Pensez à prévenir vos élèves et à rassembler leurs questions pour ${prenom}.`,
        mobileText: 'Pensez à rassembler les questions de vos élèves.',
      }
    case 'PENDING':
      // « Presque confirmée » demanderait la décision de l'intervenant, absente du contrat.
      return { title: 'Demande envoyée', text: `${prenom} et la Fondation M vont vous répondre.` }
    case 'REFUSED':
      if (meeting.closedBy === 'SPEAKER') {
        return {
          title: 'Refusée par l’intervenant',
          text: meeting.reason ? `« ${meeting.reason} »` : 'Aucun motif n’a été donné.',
          cta: { label: 'Choisir un autre intervenant', to: PATHS.schoolSpeakers },
        }
      }
      if (meeting.closedBy === 'FOUNDATION') {
        return {
          title: 'Refusée par la Fondation M',
          text: meeting.reason ?? 'Aucun motif n’a été donné.',
          cta: { label: 'Choisir un autre intervenant', to: PATHS.schoolSpeakers },
        }
      }
      return {
        title: 'Créneau pris',
        text: 'Ce créneau a été attribué à une autre classe.',
        cta: { label: 'Choisir un autre intervenant', to: PATHS.schoolSpeakers },
      }
    case 'CANCELLED':
      return {
        title: meeting.closedBy === 'FOUNDATION' ? 'Annulée par la Fondation M' : 'Rencontre annulée',
        text: meeting.reason ?? 'Aucun motif n’a été donné.',
      }
    case 'COMPLETED':
      if (feedback === 'Soumis') {
        return {
          title: 'Merci pour votre retour',
          text: 'La Fondation M est en train de le lire avant de le partager aux donateurs.',
          mobileText: 'La Fondation M le lit avant de le partager aux donateurs.',
        }
      }
      if (feedback === 'Validé') {
        return {
          title: 'Une belle rencontre',
          text: 'Votre retour fait désormais partie du rapport d’impact partagé aux donateurs.',
          mobileText: 'Votre retour fait partie du rapport d’impact.',
        }
      }
      return {
        title: 'Comment cela s’est-il passé ?',
        text: `Racontez-nous ce que vous et vos élèves avez vécu avec ${prenom}.`,
        mobileText: `Racontez-nous ce que vous avez vécu avec ${prenom}.`,
        // « Retours d'expérience » n'existe pas encore : bouton affiché « Bientôt ».
        cta: feedback === 'À rédiger' ? { label: 'Partager votre retour d’expérience', to: null } : undefined,
      }
  }
}

/** Lien vers une rencontre dans « Mes rencontres », sur le mois de son créneau. */
export function meetingLink(meeting: SchoolMeeting): string {
  const start = parseIso(meeting.startAt)
  const month = start ? `&mois=${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}` : ''
  return `${PATHS.schoolMeetings}?rencontre=${encodeURIComponent(meeting.id)}${month}`
}

const WEEKDAY_SHORT = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' })
const MONTH_SHORT = new Intl.DateTimeFormat('fr-FR', { month: 'short' })
const WEEKDAY_LONG = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' })
const MONTH_LONG = new Intl.DateTimeFormat('fr-FR', { month: 'long' })

function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase('fr-FR') + value.slice(1)
}

/** « 10h00 », « 9h30 ». */
export function clock(date: Date): string {
  return `${date.getHours()}h${String(date.getMinutes()).padStart(2, '0')}`
}

/** « 10h » dans une phrase (« … à 10h. »), « 9h30 » sinon. */
export function clockInSentence(date: Date): string {
  return date.getMinutes() === 0 ? `${date.getHours()}h` : clock(date)
}

/** « Mardi 17 novembre · 10h00 » (détail). */
export function detailDate(date: Date): string {
  return `${capitalize(WEEKDAY_LONG.format(date))} ${date.getDate()} ${MONTH_LONG.format(date)} · ${clock(date)}`
}

/** « mardi 17 novembre » (bandeau). */
export function sentenceDate(date: Date): string {
  return `${WEEKDAY_LONG.format(date)} ${date.getDate()} ${MONTH_LONG.format(date)}`
}

/** « Mar 17 nov. » (listes : jour sans point, mois abrégé). */
export function rowDate(date: Date): string {
  return `${capitalize(WEEKDAY_SHORT.format(date).replace('.', ''))} ${date.getDate()} ${MONTH_SHORT.format(date)}`
}

/** « Dans 4 jours », « Demain », « Aujourd'hui ». */
export function whenLabel(start: Date, now: Date): string {
  const day = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const days = Math.round((day - today) / 86_400_000)
  if (days <= 0) return 'Aujourd’hui'
  if (days === 1) return 'Demain'
  return `Dans ${days} jours`
}

/**
 * Lieu affiché : « En classe · Salle 12 », « En classe » ; une rencontre en ligne ancienne : « En ligne · salle
 * informatique », « En ligne » (F6.1).
 */
export function placeLabel(meeting: SchoolMeeting): string | null {
  if (meeting.format === 'ONLINE') return meeting.place ? `En ligne · ${meeting.place}` : 'En ligne'
  return meeting.place ? `En classe · ${meeting.place}` : 'En classe'
}

/** Rencontres groupées par jour local du début du créneau. */
export function groupMeetingsByDay(meetings: readonly SchoolMeeting[]): Map<string, SchoolMeeting[]> {
  const days = new Map<string, SchoolMeeting[]>()
  for (const meeting of meetings) {
    const start = parseIso(meeting.startAt)
    if (start === null) continue
    const key = dayKey(start)
    days.set(key, [...(days.get(key) ?? []), meeting])
  }
  return days
}
