import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { MonthTable } from './MonthTable'

interface CompactMonthProps<T> {
  month: Date
  now: Date
  caption: string
  byDay: ReadonlyMap<string, readonly T[]>
  isSelected: (item: T) => boolean
  onSelect: (item: T) => void
  /** Libellé ARIA du bouton d'un jour qui a des éléments (le premier est sélectionné au clic). */
  label: (day: Date, items: readonly T[]) => string
  /** Repère sous le numéro du jour (pastille de statut, nombre). */
  renderMarker: (items: readonly T[]) => ReactNode
  /** Hauteur d'un jour : 46 px (école, W1-E5), 48 px (Fondation, W3-rencontres). */
  dayHeightClassName?: string
}

/**
 * Calendrier compact mobile (maquettes W1-E5-mobile, W3-rencontres-mobile) : un bouton par jour qui a des éléments,
 * jour sélectionné encre / crème, aujourd'hui terracotta, jours passés `#F1EBDD`.
 */
export function CompactMonth<T>({
  month,
  now,
  caption,
  byDay,
  isSelected,
  onSelect,
  label,
  renderMarker,
  dayHeightClassName = 'h-[46px]',
}: CompactMonthProps<T>) {
  return (
    <MonthTable
      month={month}
      now={now}
      compact
      caption={caption}
      className="border-spacing-0.5 text-center"
      headerClassName="text-[11px] font-black text-muted"
      cellClassName={() => 'p-0'}
      renderDay={(day, { key, inMonth, isToday, isPast }) => {
        if (!inMonth) return null
        const items = byDay.get(key) ?? []
        const first = items[0]
        const selected = items.some(isSelected)
        const look = cn(
          'flex w-full flex-col items-center justify-center gap-[3px] rounded-[12px] border-2 text-sm font-extrabold',
          dayHeightClassName,
          selected ? 'border-ink bg-cream' : isToday ? 'border-terra' : 'border-transparent',
          !selected && (isPast ? 'bg-[#F1EBDD]' : 'bg-surface'),
          isToday ? 'text-terra' : isPast ? 'text-muted' : 'text-ink',
        )
        if (first === undefined) {
          return <span className={look}>{day.getDate()}</span>
        }
        return (
          <button type="button" onClick={() => onSelect(first)} aria-pressed={selected} aria-label={label(day, items)} className={look}>
            <span>{day.getDate()}</span>
            {renderMarker(items)}
          </button>
        )
      }}
    />
  )
}
