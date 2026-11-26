import { MINUTE_MS, parseIso } from '../../lib/dateTime'
import { normalizeName } from '../../lib/normalize'
import type { MyFeedback } from '../feedback/feedbackData'
import { durationLabel, parseComment } from '../feedback/feedbackFormat'
import type { Meeting } from './speakerData'

/*
 * « Mon impact » de l'intervenant (F12) : aucune API d'impact, tout est calculé ici à partir des rencontres et des
 * retours déjà chargés (décision 120). Seules les rencontres COMPLETED comptent.
 */

export interface SpeakerImpact {
  completed: number
  /** Établissements distincts : nom + ville + pays (pas d'identifiant dans le contrat). */
  schools: number
  /** Somme des effectifs déclarés des classes distinctes (pas un comptage des présents). */
  studentsReached: number
  /** Classes distinctes sans effectif déclaré (non comptées). */
  classesWithoutCount: number
  totalMinutes: number
  averageMinutes: number | null
  /** Rencontres réalisées sans créneau lisible (exclues de la durée). */
  withoutDuration: number
  /** Début de la première rencontre réalisée. */
  firstStart: Date | null
  /** CONFIRMED au créneau passé : pas encore marquées « Réalisée » par la Fondation, non comptées. */
  awaitingConfirmation: number
}

function schoolKey(meeting: Meeting): string {
  return [meeting.schoolName, meeting.schoolCity, meeting.schoolCountry].map(normalizeName).join('|')
}

/** Classe = même établissement + même intitulé : deux classes homonymes d'une école sont fusionnées (décision 121). */
function classKey(meeting: Meeting): string {
  return `${schoolKey(meeting)}|${normalizeName(meeting.classTitle)}`
}

function durationMinutes(meeting: Meeting): number | null {
  const start = parseIso(meeting.slot?.startAt ?? null)
  const end = parseIso(meeting.slot?.endAt ?? null)
  if (start === null || end === null) return null
  const minutes = Math.round((end.getTime() - start.getTime()) / MINUTE_MS)
  return minutes > 0 ? minutes : null
}

export function computeImpact(meetings: readonly Meeting[], now: Date): SpeakerImpact {
  const completed = meetings.filter((meeting) => meeting.status === 'COMPLETED')
  const schools = new Set(completed.map(schoolKey))
  const classes = new Map<string, number | null>()
  for (const meeting of completed) {
    const key = classKey(meeting)
    const known = classes.get(key) ?? null
    const count = meeting.studentCount
    // Effectif déclaré actuel : le plus grand connu pour la classe.
    classes.set(key, count === null ? known : Math.max(known ?? 0, count))
  }
  const counts = [...classes.values()]
  const durations = completed.map(durationMinutes)
  const known = durations.filter((minutes): minutes is number => minutes !== null)
  const totalMinutes = known.reduce((sum, minutes) => sum + minutes, 0)
  const starts = completed
    .map((meeting) => parseIso(meeting.slot?.startAt ?? null))
    .filter((date): date is Date => date !== null)
    .toSorted((a, b) => a.getTime() - b.getTime())
  const awaitingConfirmation = meetings.filter((meeting) => {
    if (meeting.status !== 'CONFIRMED') return false
    const end = parseIso(meeting.slot?.endAt ?? meeting.slot?.startAt ?? null)
    return end !== null && end.getTime() < now.getTime()
  }).length
  return {
    completed: completed.length,
    schools: schools.size,
    studentsReached: counts.reduce<number>((sum, count) => sum + (count ?? 0), 0),
    classesWithoutCount: counts.filter((count) => count === null).length,
    totalMinutes,
    averageMinutes: known.length === 0 ? null : Math.round(totalMinutes / known.length),
    withoutDuration: durations.length - known.length,
    firstStart: starts[0] ?? null,
    awaitingConfirmation,
  }
}

export interface EmotionCount {
  label: string
  count: number
}

/**
 * Émotions de MES retours rédigés (Soumis et Validés), une fois par retour, triées par fréquence décroissante puis par
 * ordre alphabétique ; un retour en texte brut n'en apporte aucune ; une étiquette inconnue est comptée telle quelle.
 */
export function emotionCounts(feedbacks: readonly MyFeedback[]): EmotionCount[] {
  const counts = new Map<string, number>()
  for (const feedback of feedbacks) {
    const parsed = parseComment(feedback.comment)
    if (parsed.kind !== 'structured') continue
    for (const label of new Set(parsed.emotions)) counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .toSorted((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'fr'))
}

/** « 9 h 30 », « 45 min », « 0 h ». */
export function hoursLabel(minutes: number): string {
  return minutes === 0 ? '0 h' : durationLabel(minutes)
}

const MONTH_YEAR = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })

/** « Depuis septembre 2026 » (mois du début de la première rencontre réalisée, fuseau du navigateur). */
export function sinceLabel(first: Date | null): string | null {
  return first === null ? null : `Depuis ${MONTH_YEAR.format(first)}`
}

/** « 1 rencontre passée en attente… pas encore comptée. » / « {n} rencontres passées … pas encore comptées. » */
export function awaitingConfirmationText(count: number): string | null {
  if (count <= 0) return null
  return count === 1
    ? '1 rencontre passée en attente de confirmation par la Fondation M, pas encore comptée.'
    : `${count} rencontres passées en attente de confirmation par la Fondation M, pas encore comptées.`
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count > 1 ? pluralForm : singular}`
}

/** Sous-ligne des établissements : « dans 5 établissements ». */
export function schoolsLine(count: number): string {
  return `dans ${plural(count, 'établissement', 'établissements')}`
}

/** Notes de fiabilité sous les indicateurs (classes sans effectif, rencontres sans créneau lisible). */
export function caveats(impact: SpeakerImpact): string[] {
  return [
    impact.classesWithoutCount > 0 ? `Effectif inconnu pour ${plural(impact.classesWithoutCount, 'classe', 'classes')}.` : null,
    impact.withoutDuration > 0 ? `Durée inconnue pour ${plural(impact.withoutDuration, 'rencontre', 'rencontres')}.` : null,
  ].filter((line): line is string => line !== null)
}
