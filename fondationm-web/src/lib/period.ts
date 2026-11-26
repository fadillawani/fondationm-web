import { toOffsetIso } from './dateTime'

/** Périodes du sélecteur « Ce trimestre / Cette année » (tableau de bord F8, rapport d'impact du donateur F10). */
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
 * comme `GET /api/foundation/indicators` et `GET /api/donor/impact`.
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

/** « ce trimestre » / « depuis janvier ». */
export function periodPhrase(kind: PeriodKind): string {
  return kind === 'trimestre' ? 'ce trimestre' : 'depuis janvier'
}

/** `?periode=` : trimestre par défaut. */
export function periodFromParam(value: string | null): PeriodKind {
  return PERIODS.find((kind) => kind === value) ?? 'trimestre'
}
