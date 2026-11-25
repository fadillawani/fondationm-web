import { Link } from 'react-router'
import { feedbackFormPath } from '../../auth/roles'
import { CompactMonth } from '../../components/calendar/CompactMonth'
import { MonthNav } from '../../components/calendar/MonthNav'
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
                      <Link
                        to={feedbackFormPath('school', meeting.id)}
                        className="flex min-h-8 items-center justify-center rounded-[8px] border-2 border-terra bg-surface px-1 text-center text-[11px] font-black leading-tight text-terra"
                      >
                        Partager mon retour{' '}
                        <span className="sr-only">avec {meeting.speakerName}</span>
                      </Link>
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
      <CompactMonth
        month={month}
        now={now}
        caption={`Calendrier compact de ${formatMonth(month)}`}
        byDay={byDay}
        isSelected={(meeting) => meeting.id === selectedId}
        onSelect={onSelect}
        label={(day, meetings) => {
          const first = meetings[0]
          const more = meetings.length > 1 ? ` et ${meetings.length - 1} autre${meetings.length > 2 ? 's' : ''}` : ''
          return first ? `${day.getDate()} : ${first.speakerName}, ${STATUS_STYLE[first.status].label}${more}` : String(day.getDate())
        }}
        renderMarker={(meetings) => (
          <span className="flex items-center gap-0.5">
            <span aria-hidden="true" className={cn('size-[7px] rounded-pill', meetings[0] ? STATUS_STYLE[meetings[0].status].dot : '')} />
            {meetings.length > 1 && <span className="text-[9px] font-black leading-none">{meetings.length}</span>}
          </span>
        )}
      />
      <p className="text-[11px] font-bold text-muted">
        Les jours passés sont grisés. La pastille indique le statut de la rencontre.
      </p>
    </section>
  )
}
