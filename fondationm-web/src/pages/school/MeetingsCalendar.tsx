import { MonthTable } from '../../components/calendar/MonthTable'
import { cn } from '../../lib/cn'
import { formatMonth, parseIso } from '../../lib/dateTime'
import type { FeedbackState, SchoolMeeting } from './meetingsData'
import { LEGEND, STATUS_STYLE, clock, firstName } from './meetingText'

interface CalendarProps {
  month: Date
  now: Date
  byDay: ReadonlyMap<string, SchoolMeeting[]>
  feedback: ReadonlyMap<string, FeedbackState>
  selectedId: string | null
  onSelect: (meeting: SchoolMeeting) => void
  onMonth: (delta: number) => void
}

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-[18px]">
      <path d={direction === 'left' ? 'm15 6-6 6 6 6' : 'm9 6 6 6-6 6'} />
    </svg>
  )
}

function MonthNav({ month, onMonth, compact }: { month: Date; onMonth: (delta: number) => void; compact: boolean }) {
  const button = compact
    ? 'inline-flex size-11 items-center justify-center rounded-[12px] bg-canvas text-ink'
    : 'inline-flex size-11 items-center justify-center rounded-[12px] border-2 border-line bg-surface text-ink'
  return (
    <div className="flex items-center justify-between gap-3">
      <button type="button" aria-label="Mois précédent" onClick={() => onMonth(-1)} className={button}>
        <Chevron direction="left" />
      </button>
      <h2 aria-live="polite" className={compact ? 'text-[21px] text-ink' : 'text-[26px] text-ink'}>
        {formatMonth(month)}
      </h2>
      <button type="button" aria-label="Mois suivant" onClick={() => onMonth(1)} className={button}>
        <Chevron direction="right" />
      </button>
    </div>
  )
}

/** « Awa, 10h00, Confirmée » (+ « , passée »). */
function meetingAria(meeting: SchoolMeeting, past: boolean): string {
  const start = parseIso(meeting.startAt)
  return `${firstName(meeting.speakerName)}, ${start ? clock(start) : ''}, ${STATUS_STYLE[meeting.status].label}${past ? ', passée' : ''}`
}

/** Calendrier PC (maquette W1-E5-pc) : une pastille-bouton par rencontre dans chaque jour. */
export function MeetingsCalendar({ month, now, byDay, feedback, selectedId, onSelect, onMonth }: CalendarProps) {
  return (
    <section aria-label="Calendrier" className="flex flex-col gap-3.5 rounded-[24px] bg-surface p-5">
      <MonthNav month={month} onMonth={onMonth} compact={false} />
      <MonthTable
        month={month}
        now={now}
        caption={`Calendrier de ${formatMonth(month)}`}
        className="border-spacing-1.5"
        headerClassName="text-xs font-black uppercase text-muted"
        cellClassName={(_day, { inMonth, isToday, isPast }) =>
          cn(
            'h-[104px] rounded-[12px] p-1.5 align-top',
            !inMonth ? 'border-0 bg-transparent' : isToday ? 'border-2 border-terra' : 'border border-[#EDE6D6]',
            inMonth && (isPast ? 'bg-[#F1EBDD]' : 'bg-surface'),
          )
        }
        renderDay={(day, { key, inMonth, isToday, isPast }) => {
          if (!inMonth) return null
          const meetings = byDay.get(key) ?? []
          return (
            <div className="flex h-full min-w-0 flex-col gap-1">
              <span
                className={cn(
                  'inline-flex h-[26px] min-w-[26px] items-center justify-center self-start rounded-pill px-1 text-[13px] font-black',
                  isToday ? 'bg-terra text-white' : isPast ? 'text-muted' : 'text-ink',
                )}
              >
                {day.getDate()}
              </span>
              {meetings.map((meeting) => {
                const start = parseIso(meeting.startAt)
                const toWrite = meeting.status === 'COMPLETED' && feedback.get(meeting.id) === 'À rédiger'
                return (
                  <div key={meeting.id} className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => onSelect(meeting)}
                      aria-pressed={selectedId === meeting.id}
                      aria-label={meetingAria(meeting, isPast)}
                      className={cn(
                        'min-h-9 w-full overflow-hidden rounded-[8px] px-1.5 py-1 text-left text-xs font-extrabold leading-tight',
                        STATUS_STYLE[meeting.status].chip,
                        selectedId === meeting.id && 'outline-[3px] outline-offset-1 outline-ink outline',
                      )}
                    >
                      {start ? clock(start) : ''} · {firstName(meeting.speakerName)}
                    </button>
                    {toWrite && (
                      <span className="flex min-h-8 items-center justify-center rounded-[8px] border-2 border-terra bg-surface px-1 text-center text-[11px] font-black leading-tight text-terra">
                        Partager mon retour · Bientôt
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )
        }}
      />
      <ul aria-label="Légende" className="flex flex-wrap gap-3.5 pt-1.5 text-xs font-extrabold text-muted">
        {LEGEND.map((status) => (
          <li key={status} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={cn('size-3 rounded-[4px]', STATUS_STYLE[status].dot, status === 'CANCELLED' && 'border border-[#B8AE98]')}
            />
            {STATUS_STYLE[status].label}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3 rounded-[4px] bg-[#F1EBDD]" />
          Jour passé
        </li>
      </ul>
    </section>
  )
}

/** Calendrier compact mobile (maquette W1-E5-mobile) : un bouton par jour qui a des rencontres. */
export function CompactCalendar({ month, now, byDay, selectedId, onSelect, onMonth }: CalendarProps) {
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
          const meetings = byDay.get(key) ?? []
          const first = meetings[0]
          const selected = meetings.some((meeting) => meeting.id === selectedId)
          const look = cn(
            'flex h-[46px] w-full flex-col items-center justify-center gap-[3px] rounded-[12px] border-2 text-sm font-extrabold',
            selected ? 'border-ink bg-cream' : isToday ? 'border-terra' : 'border-transparent',
            !selected && (isPast ? 'bg-[#F1EBDD]' : 'bg-surface'),
            isToday ? 'text-terra' : isPast ? 'text-muted' : 'text-ink',
          )
          if (first === undefined) {
            return <span className={look}>{day.getDate()}</span>
          }
          const more = meetings.length > 1 ? ` et ${meetings.length - 1} autre${meetings.length > 2 ? 's' : ''}` : ''
          return (
            <button
              type="button"
              onClick={() => onSelect(first)}
              aria-pressed={selected}
              aria-label={`${day.getDate()} : ${first.speakerName}, ${STATUS_STYLE[first.status].label}${more}`}
              className={look}
            >
              <span>{day.getDate()}</span>
              <span className="flex items-center gap-0.5">
                <span aria-hidden="true" className={cn('size-[7px] rounded-pill', STATUS_STYLE[first.status].dot)} />
                {meetings.length > 1 && <span className="text-[9px] font-black leading-none">{meetings.length}</span>}
              </span>
            </button>
          )
        }}
      />
      <p className="text-[11px] font-bold text-muted">
        Les jours passés sont grisés. La pastille indique le statut de la rencontre.
      </p>
    </section>
  )
}
