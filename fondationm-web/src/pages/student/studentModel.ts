import { formatCompactDay, formatDay, formatDayInline, parseIso, startOfDay } from '../../lib/dateTime'
import type { StudentMeeting } from './studentData'

const DAY_MS = 86_400_000
const time = (iso: string | null) => parseIso(iso)?.getTime() ?? 0

/** Écart en jours de calendrier (fuseau du navigateur) entre le jour de `date` et celui de `now`. */
export function dayDifference(date: Date, now: Date): number {
  return Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / DAY_MS)
}

/** Créneau terminé (fin, sinon début, passé). */
export function isOver(meeting: StudentMeeting, now: Date): boolean {
  return time(meeting.endAt ?? meeting.startAt) < now.getTime()
}

export interface StudentLists {
  /** CONFIRMED à venir par date croissante, puis CONFIRMED au créneau passé (la plus récente d'abord). */
  upcoming: StudentMeeting[]
  /** COMPLETED, la plus récente d'abord. */
  past: StudentMeeting[]
}

export function splitMeetings(meetings: readonly StudentMeeting[], now: Date): StudentLists {
  const confirmed = meetings.filter((meeting) => meeting.status === 'CONFIRMED')
  const future = confirmed.filter((meeting) => !isOver(meeting, now)).toSorted((a, b) => time(a.startAt) - time(b.startAt))
  const overdue = confirmed.filter((meeting) => isOver(meeting, now)).toSorted((a, b) => time(b.startAt) - time(a.startAt))
  const past = meetings.filter((meeting) => meeting.status === 'COMPLETED').toSorted((a, b) => time(b.startAt) - time(a.startAt))
  return { upcoming: [...future, ...overdue], past }
}

/** Sélection : l'URL, sinon la rencontre future la plus proche, sinon la plus récente (décision 114). */
export function defaultMeeting(meetings: readonly StudentMeeting[], now: Date): StudentMeeting | undefined {
  const lists = splitMeetings(meetings, now)
  const next = lists.upcoming.find((meeting) => !isOver(meeting, now))
  return next ?? meetings.toSorted((a, b) => time(b.startAt) - time(a.startAt))[0]
}

/**
 * Libellé relatif, neutre en genre (décision 111) : « Aujourd'hui », « Demain », « Dans {n} jours » (2 à 13), date seule
 * à partir de 14 jours ; « Hier », « Il y a {n} jours » pour une rencontre encore confirmée au créneau passé ;
 * « Vécue avec ta classe » pour une rencontre réalisée.
 */
export function relativeLabel(meeting: StudentMeeting, now: Date): string {
  if (meeting.status === 'COMPLETED') return 'Vécue avec ta classe'
  const start = parseIso(meeting.startAt)
  if (start === null) return ''
  const days = dayDifference(start, now)
  if (days === 0) return 'Aujourd’hui'
  if (days === 1) return 'Demain'
  if (days === -1) return 'Hier'
  if (days < 0) return `Il y a ${-days} jours`
  return days < 14 ? `Dans ${days} jours` : formatCompactDay(start)
}

function lowerFirst(value: string): string {
  return value.charAt(0).toLocaleLowerCase('fr-FR') + value.slice(1)
}

/** Phrase d'accroche (décision 111), sans accord de genre ni promesse. */
export function greetingSentence(lists: StudentLists, now: Date): string {
  const next = lists.upcoming.find((meeting) => !isOver(meeting, now))
  if (next === undefined) {
    return lists.upcoming.length + lists.past.length === 0
      ? 'Les rencontres de ta classe apparaîtront ici dès qu’elles seront confirmées.'
      : 'Pas de nouvelle rencontre prévue pour l’instant. Retrouve ici celles que ta classe a déjà vécues.'
  }
  const start = parseIso(next.startAt)
  const days = start ? dayDifference(start, now) : 0
  const when =
    days === 0 ? 'Aujourd’hui' : days === 1 ? 'Demain' : days < 14 ? `Dans ${days} jours` : start ? `Le ${formatDayInline(start)}` : 'Bientôt'
  const who = next.jobTitle ? `${next.speakerName}, ${lowerFirst(next.jobTitle)}` : next.speakerName
  return `${when}, ta classe rencontre ${who}. Une belle occasion de découvrir ${next.jobTitle ? 'son' : 'un'} métier.`
}

export interface InfoBox {
  title: string
  text: string
}

/** Encart du détail : textes fixes, vrais pour toute rencontre (décision 115). */
export function infoBox(meeting: StudentMeeting, now: Date): InfoBox {
  if (meeting.status === 'COMPLETED') {
    return {
      title: 'Ce que tu as vécu',
      text: `Ta classe a rencontré ${meeting.speakerName}. Si ce métier t’a plu, parles-en à ton référent orientation : il peut t’aider à regarder les études possibles.`,
    }
  }
  if (isOver(meeting, now)) {
    const start = parseIso(meeting.startAt)
    return {
      title: 'En attente de confirmation',
      text: `Cette rencontre était prévue le ${start ? formatDayInline(start) : '—'}. La Fondation M doit encore confirmer qu’elle a bien eu lieu.`,
    }
  }
  return {
    title: 'Pour te préparer',
    text: 'Note deux questions avant la rencontre. Par exemple : à quoi ressemble une journée de travail ? Quelles études faut-il suivre ?',
  }
}

/** « Demain · Mardi 17 novembre » (confirmée) ou « Jeudi 22 octobre » (réalisée). */
export function detailDate(meeting: StudentMeeting, now: Date): string {
  const start = parseIso(meeting.startAt)
  if (start === null) return ''
  const day = formatDay(start)
  if (meeting.status === 'COMPLETED') return day
  const label = relativeLabel(meeting, now)
  return label === formatCompactDay(start) ? day : `${label} · ${day}`
}

const MONTH = new Intl.DateTimeFormat('fr-FR', { month: 'short' })

/** Pavé de date de la liste : « 17 » et « NOV. ». */
export function dayBlock(meeting: StudentMeeting): { day: string; month: string } {
  const start = parseIso(meeting.startAt)
  return start ? { day: String(start.getDate()), month: MONTH.format(start).toLocaleUpperCase('fr-FR') } : { day: '', month: '' }
}
