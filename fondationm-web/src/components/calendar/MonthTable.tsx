import type { ReactNode } from 'react'
import { dayInfo, monthWeeks, type DayInfo } from '../../lib/calendar'
import { cn } from '../../lib/cn'

const WEEKDAYS = [
  ['Lun', 'L', 'Lundi'],
  ['Mar', 'M', 'Mardi'],
  ['Mer', 'M', 'Mercredi'],
  ['Jeu', 'J', 'Jeudi'],
  ['Ven', 'V', 'Vendredi'],
  ['Sam', 'S', 'Samedi'],
  ['Dim', 'D', 'Dimanche'],
] as const

interface MonthTableProps {
  month: Date
  now: Date
  caption: string
  /** En-têtes « Lun » (PC) ou « L » (compact). */
  compact?: boolean
  className?: string
  headerClassName?: string
  cellClassName: (day: Date, info: DayInfo) => string
  renderDay: (day: Date, info: DayInfo) => ReactNode
}

/**
 * Calendrier mensuel accessible (tableau, semaine du lundi, `caption`, en-têtes avec `abbr`).
 * Partagé par l'agenda de l'intervenant (F3) et « Mes rencontres » de l'école (F5).
 */
export function MonthTable({
  month,
  now,
  caption,
  compact = false,
  className,
  headerClassName,
  cellClassName,
  renderDay,
}: MonthTableProps) {
  return (
    <table className={cn('w-full table-fixed border-separate', className)}>
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr>
          {WEEKDAYS.map(([short, letter, long]) => (
            <th key={long} scope="col" abbr={long} className={headerClassName}>
              {compact ? letter : short}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {monthWeeks(month).map((week) => (
          <tr key={week[0]?.toISOString() ?? 'semaine'}>
            {week.map((day) => {
              const info = dayInfo(day, month, now)
              return (
                <td key={info.key} aria-current={info.isToday ? 'date' : undefined} className={cellClassName(day, info)}>
                  {renderDay(day, info)}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
