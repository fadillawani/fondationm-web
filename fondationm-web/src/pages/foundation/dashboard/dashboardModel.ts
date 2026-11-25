import { parseIso, toOffsetIso } from '../../../lib/dateTime'
import type { FoundationMeeting } from '../meetings/foundationMeetingsData'
import { isToMark } from '../meetings/foundationMeetingState'

export type PeriodKind = 'trimestre' | 'annee'
export const PERIODS: readonly PeriodKind[] = ['trimestre', 'annee']
export const PERIOD_LABEL: Record<PeriodKind, string> = { trimestre: 'Ce trimestre', annee: 'Cette année' }

export interface Period {
  kind: PeriodKind
  from: Date
  to: Date
}

/**
 * Bornes de la période dans le fuseau du navigateur : trimestre civil en cours ou année civile ; `to` exclu,
 * comme `GET /api/foundation/indicators`.
 */
export function periodBounds(kind: PeriodKind, now: Date): Period {
  const year = now.getFullYear()
  if (kind === 'annee') return { kind, from: new Date(year, 0, 1), to: new Date(year + 1, 0, 1) }
  const first = Math.floor(now.getMonth() / 3) * 3
  return { kind, from: new Date(year, first, 1), to: new Date(year, first + 3, 1) }
}

/** Paramètres `from` / `to` avec décalage (« 2026-10-01T00:00:00+01:00 »). */
export function periodQuery(period: Period): { from: string; to: string } {
  return { from: toOffsetIso(period.from), to: toOffsetIso(period.to) }
}

/** « ce trimestre » / « depuis janvier » (sous-ligne des jeunes touchés). */
export function periodPhrase(kind: PeriodKind): string {
  return kind === 'trimestre' ? 'ce trimestre' : 'depuis janvier'
}

function inPeriod(meeting: FoundationMeeting, period: Period): boolean {
  const start = parseIso(meeting.startAt)
  return start !== null && start >= period.from && start < period.to
}

/** Taux de réalisation : réalisées / (réalisées + confirmées passées), sur les rencontres dont le début est dans la période. */
export function completionRate(meetings: readonly FoundationMeeting[], period: Period, now: Date) {
  const scoped = meetings.filter((meeting) => inPeriod(meeting, period))
  const completed = scoped.filter((meeting) => meeting.status === 'COMPLETED').length
  const confirmedPast = scoped.filter((meeting) => isToMark(meeting, now)).length
  const base = completed + confirmedPast
  return { completed, base, rate: base === 0 ? null : Math.round((completed / base) * 100) }
}

export interface Bucket {
  label: string
  /** Libellé complet pour le tableau et l'`aria-label` (« novembre », « 2e trimestre »). */
  longLabel: string
  done: number
  planned: number
}

const MONTH_SHORT = new Intl.DateTimeFormat('fr-FR', { month: 'short' })
const MONTH_LONG = new Intl.DateTimeFormat('fr-FR', { month: 'long' })

function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase('fr-FR') + value.slice(1)
}

/**
 * « Rencontres par mois » : les 3 mois du trimestre, ou les 4 trimestres de l'année. Réalisées = COMPLETED ;
 * prévues = PENDING ou CONFIRMED dont le créneau est à venir.
 */
export function meetingBuckets(meetings: readonly FoundationMeeting[], period: Period, now: Date): Bucket[] {
  const buckets: Bucket[] =
    period.kind === 'trimestre'
      ? [0, 1, 2].map((offset) => {
          const month = new Date(period.from.getFullYear(), period.from.getMonth() + offset, 1)
          return { label: capitalize(MONTH_SHORT.format(month)), longLabel: MONTH_LONG.format(month), done: 0, planned: 0 }
        })
      : [1, 2, 3, 4].map((quarter) => ({
          label: `T${quarter}`,
          longLabel: quarter === 1 ? '1er trimestre' : `${quarter}e trimestre`,
          done: 0,
          planned: 0,
        }))
  for (const meeting of meetings) {
    const start = parseIso(meeting.startAt)
    if (start === null || !inPeriod(meeting, period)) continue
    const index =
      period.kind === 'trimestre'
        ? (start.getFullYear() - period.from.getFullYear()) * 12 + start.getMonth() - period.from.getMonth()
        : Math.floor(start.getMonth() / 3)
    const bucket = buckets[index]
    if (bucket === undefined) continue
    if (meeting.status === 'COMPLETED') bucket.done += 1
    else if ((meeting.status === 'PENDING' || meeting.status === 'CONFIRMED') && start.getTime() >= now.getTime()) bucket.planned += 1
  }
  return buckets
}

/** Libellé du graphique : « Rencontres par mois : octobre 9 (9 réalisées), novembre 22 (15 réalisées, 7 prévues)… ». */
export function chartLabel(buckets: readonly Bucket[], kind: PeriodKind): string {
  const parts = buckets.map((bucket) => {
    const details = [
      bucket.done > 0 ? `${bucket.done} réalisée${bucket.done > 1 ? 's' : ''}` : null,
      bucket.planned > 0 ? `${bucket.planned} prévue${bucket.planned > 1 ? 's' : ''}` : null,
    ].filter(Boolean)
    return `${bucket.longLabel} ${bucket.done + bucket.planned}${details.length > 0 ? ` (${details.join(', ')})` : ''}`
  })
  return `Rencontres par ${kind === 'trimestre' ? 'mois' : 'trimestre'} : ${parts.join(', ')}`
}

/** Phrase de l'en-tête (somme des cartes « À faire »). */
export function actionsSentence(count: number): string {
  if (count === 0) return 'Tout est à jour. Chaque validation a déjà rapproché des classes d’un métier.'
  return `${count === 1 ? '1 action vous attend' : `${count} actions vous attendent`}. Chaque validation rapproche une classe d’un métier.`
}

/** « Le moment de la semaine » si le retour a été publié il y a moins de 7 jours, sinon « Un moment marquant ». */
export function momentTitle(publishedAt: string | null, now: Date): string {
  const published = parseIso(publishedAt)
  return published !== null && now.getTime() - published.getTime() < 7 * 86_400_000 ? 'Le moment de la semaine' : 'Un moment marquant'
}

/** « 4,3 / 5 » ou « — ». */
export function ratingText(value: number | null): string {
  return value === null ? '—' : `${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} / 5`
}

/** « Lundi 16 novembre 2026 » (PC) et « Lundi 16 novembre » (mobile). */
export function todayLabels(now: Date): { long: string; short: string } {
  const short = capitalize(new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(now))
  return { long: `${short} ${now.getFullYear()}`, short }
}
