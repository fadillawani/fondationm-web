import { MonthTable } from '../../components/calendar/MonthTable'
import { cn } from '../../lib/cn'
import { formatDayWithYear, formatTime } from '../../lib/dateTime'
import {
  AGENDA_STATES,
  STATE_CLASS,
  STATE_LABEL,
  STATE_SHORT,
  canPublishOn,
  itemLabel,
  type AgendaItem,
} from './agendaModel'

interface MonthGridProps {
  month: Date
  now: Date
  byDay: Map<string, AgendaItem[]>
  selectedDay: string | null
  selectedItem: string | null
  onSelectDay: (day: Date) => void
  onSelectItem: (item: AgendaItem) => void
  onNewSlot: (day: Date) => void
  monthLabel: string
}

export function MonthGrid({
  month,
  now,
  byDay,
  selectedDay,
  selectedItem,
  onSelectDay,
  onSelectItem,
  onNewSlot,
  monthLabel,
}: MonthGridProps) {
  return (
    <div className="flex flex-col gap-4">
      <MonthTable
        month={month}
        now={now}
        caption={`Calendrier de ${monthLabel}`}
        className="border-spacing-1"
        headerClassName="pb-1 text-xs font-black uppercase tracking-[0.08em] text-muted"
        cellClassName={(_day, { key, inMonth }) =>
          cn(
            'h-28 rounded-field border-2 p-1 align-top',
            selectedDay === key ? 'border-ink' : 'border-line',
            inMonth ? 'bg-surface' : 'bg-canvas',
          )
        }
        renderDay={(day, { key, inMonth, isToday }) => {
          const items = byDay.get(key) ?? []
          return (
            <div className="flex h-full flex-col gap-1">
              <button
                type="button"
                onClick={() => onSelectDay(day)}
                aria-pressed={selectedDay === key}
                aria-current={isToday ? 'date' : undefined}
                aria-label={`${formatDayWithYear(day)}${isToday ? ", aujourd'hui" : ''}, ${
                  items.length === 0 ? 'rien de prévu' : `${items.length} élément${items.length > 1 ? 's' : ''}`
                }`}
                className={cn(
                  'inline-flex min-h-8 min-w-8 items-center justify-center self-start rounded-pill text-sm font-black',
                  isToday ? 'bg-terra text-white' : inMonth ? 'text-ink' : 'text-muted',
                )}
              >
                {day.getDate()}
              </button>
              {items.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onSelectItem(item)}
                  aria-pressed={selectedItem === item.key}
                  aria-label={itemLabel(item)}
                  className={cn(
                    'flex flex-col rounded-[8px] px-1 py-0.5 text-left text-[11px] leading-tight font-extrabold',
                    STATE_CLASS[item.state],
                    selectedItem === item.key && 'ring-2 ring-ink ring-offset-1',
                  )}
                >
                  <span>{formatTime(item.start)}</span>
                  <span className="font-bold">{STATE_SHORT[item.state]}</span>
                </button>
              ))}
              {canPublishOn(day, now) && (
                <button
                  type="button"
                  onClick={() => onNewSlot(day)}
                  aria-label={`Publier un créneau le ${formatDayWithYear(day)}`}
                  className="mt-auto rounded-[8px] border border-dashed border-muted px-1 text-[11px] font-extrabold text-muted hover:border-ink hover:text-ink"
                >
                  + Créneau
                </button>
              )}
            </div>
          )
        }}
      />

      <ul aria-label="Légende" className="flex flex-wrap gap-x-4 gap-y-2">
        {AGENDA_STATES.map((state) => (
          <li key={state} className="flex items-center gap-2 text-sm font-bold text-ink">
            <span aria-hidden="true" className={cn('size-3.5 rounded-[4px]', STATE_CLASS[state])} />
            {STATE_LABEL[state]}
            {state === 'FREE' && ' (disponible)'}
          </li>
        ))}
      </ul>
    </div>
  )
}
