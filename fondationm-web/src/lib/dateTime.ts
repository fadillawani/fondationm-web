/*
 * Dates et heures dans le fuseau du navigateur, en français.
 * « Mardi 24 novembre, 10h00 – 11h30 ».
 */

const WEEKDAY_DAY_MONTH = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
const WEEKDAY_DAY_MONTH_YEAR = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const SHORT_DAY = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
const MONTH_YEAR = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })
const WEEKDAY_SHORT = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' })
const MONTH_SHORT = new Intl.DateTimeFormat('fr-FR', { month: 'short' })
const WEEKDAY_LONG = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' })
const DAY_MONTH = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' })

export const MINUTE_MS = 60_000

function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase('fr-FR') + value.slice(1)
}

export function parseIso(iso: string | null): Date | null {
  if (iso === null) return null
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date
}

const pad = (value: number) => String(value).padStart(2, '0')

/** « 10h00 ». */
export function formatTime(date: Date): string {
  return `${date.getHours()}h${pad(date.getMinutes())}`
}

/** « Mardi 24 novembre ». */
export function formatDay(date: Date): string {
  return capitalize(WEEKDAY_DAY_MONTH.format(date))
}

/** « mardi 24 novembre 2026 » (libellés ARIA). */
export function formatDayWithYear(date: Date): string {
  return WEEKDAY_DAY_MONTH_YEAR.format(date)
}

/** « Mar. 24 nov. ». */
export function formatShortDay(date: Date): string {
  return capitalize(SHORT_DAY.format(date))
}

/** « Lun 23 nov » (sans points d'abréviation). */
export function formatCompactDay(date: Date): string {
  const weekday = WEEKDAY_SHORT.format(date).replace('.', '')
  const month = MONTH_SHORT.format(date).replace('.', '')
  return `${capitalize(weekday)} ${date.getDate()} ${month}`
}

/** « Lundi ». */
export function formatWeekday(date: Date): string {
  return capitalize(WEEKDAY_LONG.format(date))
}

/** « 23 novembre ». */
export function formatDayMonth(date: Date): string {
  return DAY_MONTH.format(date)
}

/** « lundi 23 novembre » (dans une phrase). */
export function formatDayInline(date: Date): string {
  return WEEKDAY_DAY_MONTH.format(date)
}

/** « Novembre 2026 ». */
export function formatMonth(date: Date): string {
  return capitalize(MONTH_YEAR.format(date))
}

/** « 10h00 – 11h30 ». */
export function formatTimeRange(start: Date, end: Date): string {
  return `${formatTime(start)} – ${formatTime(end)}`
}

/** « Mardi 24 novembre, 10h00 – 11h30 ». */
export function formatSlot(start: Date, end: Date): string {
  return `${formatDay(start)}, ${formatTimeRange(start, end)}`
}

/** Clé locale d'un jour : « 2026-11-24 ». */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseDayKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (match === null) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return dayKey(date) === key ? date : null
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** Date locale du jour `day` à `minutes` minutes après minuit. */
export function atMinutes(day: Date, minutes: number): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(minutes / 60), minutes % 60)
}

/** ISO-8601 avec le décalage horaire du navigateur : « 2026-11-24T10:00:00+01:00 ». */
export function toOffsetIso(date: Date): string {
  const offset = -date.getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const abs = Math.abs(offset)
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  )
}

/** « 10:00 » ↔ minutes depuis minuit. */
export function minutesLabel(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
}

export function parseMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (match === null) return null
  const minutes = Number(match[1]) * 60 + Number(match[2])
  return minutes < 24 * 60 ? minutes : null
}
