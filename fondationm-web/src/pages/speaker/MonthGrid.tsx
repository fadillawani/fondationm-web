import { MonthTable } from '../../components/calendar/MonthTable'
import { cn } from '../../lib/cn'
import { formatDayWithYear, formatTime } from '../../lib/dateTime'
import {
  AGENDA_STATES,
  STATE_CLASS,
  STATE_LABEL,
  STATE_SHORT,
  canPublishOn,
  chipText,
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
        className="border-spacing-1.5"
        headerClassName="text-xs font-black uppercase text-muted"
        cellClassName={(_day, { key, inMonth, isToday, isPast }) =>
          cn(
            'h-[108px] rounded-[12px] p-1.5 align-top',
            !inMonth ? 'border-0 bg-transparent' : isToday ? 'border-2 border-terra' : 'border border-[#EDE6D6]',
            inMonth && (isPast ? 'bg-[#F1EBDD]' : 'bg-surface'),
            selectedDay === key && 'outline-[3px] outline-offset-1 outline-ink outline',
          )
        }
        renderDay={(day, { key, inMonth, isToday, isPast }) => {
          if (!inMonth) return null
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
                  'inline-flex h-[26px] min-w-[26px] items-center justify-center self-start rounded-pill px-1 text-[13px] font-black',
                  isToday ? 'bg-terra text-white' : isPast ? 'text-muted' : 'text-ink',
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
                    'flex min-h-[38px] w-full flex-col justify-center overflow-hidden rounded-[8px] px-1.5 py-[3px] text-left text-xs font-extrabold leading-tight',
                    STATE_CLASS[item.state],
                    selectedItem === item.key && 'outline-[3px] outline-offset-1 outline-ink outline',
                  )}
                >
                  <span>{chipText(item, formatTime(item.start))}</span>
                  {/* Confirmé / Réalisé : la maquette n'affiche que la ville ; l'état reste écrit (jamais la couleur seule). */}
                  {(item.state === 'CONFIRMED' || item.state === 'COMPLETED') && (
                    <span className="font-bold no-underline">{STATE_SHORT[item.state]}</span>
                  )}
                </button>
              ))}
              {canPublishOn(day, now) && (
                <button
                  type="button"
                  onClick={() => onNewSlot(day)}
                  aria-label={`Publier un créneau le ${formatDayWithYear(day)}`}
                  className={cn(
                    'mt-auto min-h-[30px] rounded-[8px] border-2 border-dashed px-1 text-xs font-black text-[#3B5221]',
                    selectedDay === key ? 'border-green bg-[#E8EEDF]' : 'border-[#C9BFA8] bg-transparent',
                  )}
                >
                  + Créneau
                </button>
              )}
            </div>
          )
        }}
      />

      <ul aria-label="Légende" className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-extrabold text-muted">
        {AGENDA_STATES.map((state) => (
          <li key={state} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={cn('size-3.5 rounded-[4px]', STATE_CLASS[state])} />
            {STATE_LABEL[state]}
            {state === 'FREE' && ' (disponible)'}
          </li>
        ))}
      </ul>
    </div>
  )
}
