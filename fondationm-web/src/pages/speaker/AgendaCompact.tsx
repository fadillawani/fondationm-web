import { MonthNav } from '../../components/calendar/MonthNav'
import { MonthTable } from '../../components/calendar/MonthTable'
import { cn } from '../../lib/cn'
import { formatDayWithYear, formatMonth } from '../../lib/dateTime'
import { AGENDA_STATES, STATE_DOT, STATE_LABEL, canPublishOn, itemLabel, type AgendaItem } from './agendaModel'

interface AgendaCompactProps {
  month: Date
  now: Date
  byDay: ReadonlyMap<string, AgendaItem[]>
  selectedKey: string | null
  selectedDay: string | null
  onSelectItem: (item: AgendaItem) => void
  onNewSlot: (day: Date) => void
  onMonth: (delta: number) => void
}

const LEGEND_SHORT: Record<string, string> = { CLOSED: 'Annulé' }

/**
 * Agenda mobile (maquette W2-E8-mobile) : calendrier compact. Un jour avec un élément sélectionne le
 * premier ; un jour libre à venir ouvre le formulaire de publication ; les autres jours ne sont pas actifs.
 */
export function AgendaCompact({ month, now, byDay, selectedKey, selectedDay, onSelectItem, onNewSlot, onMonth }: AgendaCompactProps) {
  return (
    <section aria-label="Calendrier compact" className="flex flex-col gap-2.5 rounded-[22px] bg-surface p-3.5">
      <MonthNav month={month} onMonth={onMonth} compact />
      <MonthTable
        month={month}
        now={now}
        compact
        caption={`Calendrier compact de ${formatMonth(month)}`}
        className="border-spacing-0.5 text-center"
        headerClassName="text-[11px] font-black text-muted"
        cellClassName={() => 'p-0'}
        renderDay={(day, { key, inMonth, isToday, isPast }) => {
          if (!inMonth) return null
          const items = byDay.get(key) ?? []
          const first = items[0]
          const selected = (first !== undefined && items.some((item) => item.key === selectedKey)) || selectedDay === key
          const look = cn(
            'flex h-12 w-full flex-col items-center justify-center gap-[3px] rounded-[12px] border-2 text-sm font-extrabold',
            isToday ? 'border-terra' : selected ? 'border-ink' : 'border-transparent',
            selected ? 'bg-cream' : isPast ? 'bg-[#F1EBDD]' : 'bg-surface',
            isToday ? 'text-terra' : isPast ? 'text-muted' : 'text-ink',
          )
          if (first !== undefined) {
            const more = items.length > 1 ? `, et ${items.length - 1} autre${items.length > 2 ? 's' : ''}` : ''
            return (
              <button type="button" onClick={() => onSelectItem(first)} aria-pressed={selected} aria-label={`${itemLabel(first)}${more}`} className={look}>
                <span>{day.getDate()}</span>
                <span aria-hidden="true" className={cn('size-[9px] rounded-pill', STATE_DOT[first.state])} />
              </button>
            )
          }
          if (canPublishOn(day, now)) {
            return (
              <button
                type="button"
                onClick={() => onNewSlot(day)}
                aria-pressed={selected}
                aria-label={`Publier un créneau le ${formatDayWithYear(day)}`}
                className={look}
              >
                <span>{day.getDate()}</span>
                <span aria-hidden="true" className="size-[9px]" />
              </button>
            )
          }
          return <span className={look}>{day.getDate()}</span>
        }}
      />
      <ul aria-label="Légende du calendrier compact" className="flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] font-extrabold text-muted">
        {AGENDA_STATES.map((state) => (
          <li key={state} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={cn('size-2.5 rounded-pill', STATE_DOT[state])} />
            {LEGEND_SHORT[state] ?? STATE_LABEL[state]}
          </li>
        ))}
      </ul>
      <p className="text-xs font-bold text-muted">Touchez un jour libre pour publier un créneau.</p>
    </section>
  )
}
