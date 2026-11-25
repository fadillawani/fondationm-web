import { dayKey, startOfDay } from './dateTime'

/** Semaines du mois (lundi → dimanche), jours des mois voisins compris. */
export function monthWeeks(month: Date): Date[][] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const offset = (first.getDay() + 6) % 7
  const cursor = new Date(first.getFullYear(), first.getMonth(), 1 - offset)
  const weeks: Date[][] = []
  do {
    const week: Date[] = []
    for (let index = 0; index < 7; index += 1) {
      week.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  } while (cursor.getMonth() === month.getMonth())
  return weeks
}

export interface DayInfo {
  key: string
  inMonth: boolean
  isToday: boolean
  isPast: boolean
}

export function dayInfo(day: Date, month: Date, now: Date): DayInfo {
  return {
    key: dayKey(day),
    inMonth: day.getMonth() === month.getMonth(),
    isToday: dayKey(day) === dayKey(now),
    isPast: day.getTime() < startOfDay(now).getTime(),
  }
}

/** « ?mois=AAAA-MM » ↔ premier jour du mois. */
export function readMonthParam(value: string | null, fallback: Date): Date {
  const match = value === null ? null : /^(\d{4})-(\d{2})$/.exec(value)
  if (match) {
    const month = Number(match[2]) - 1
    if (month >= 0 && month < 12) return new Date(Number(match[1]), month, 1)
  }
  return new Date(fallback.getFullYear(), fallback.getMonth(), 1)
}

export function monthParam(month: Date): string {
  return `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`
}
