import { useSearchParams } from 'react-router'
import { errorMessage } from '../../../api/errors'
import { CompactMonth } from '../../../components/calendar/CompactMonth'
import { MonthNav } from '../../../components/calendar/MonthNav'
import { MonthTable } from '../../../components/calendar/MonthTable'
import { PageTitle } from '../../../components/layout/PageTitle'
import { Alert } from '../../../components/ui/Alert'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Spinner } from '../../../components/ui/Spinner'
import { monthParam, readMonthParam } from '../../../lib/calendar'
import { cn } from '../../../lib/cn'
import { formatMonth, parseIso } from '../../../lib/dateTime'
import { useNow } from '../../../lib/useNow'
import { useFoundationMeetings, type FoundationMeeting } from './foundationMeetingsData'
import {
  byStart,
  calendarEntries,
  defaultMeeting,
  entryAria,
  entryStatusMeeting,
  entryText,
  isToMark,
  meetingLook,
  toMarkLabel,
  type CalendarEntry,
} from './foundationMeetingState'
import { MeetingPanel } from './MeetingPanel'

const LEGEND = [
  { label: 'En attente', className: 'bg-orange' },
  { label: 'Confirmée', className: 'bg-green' },
  { label: 'À marquer', className: 'bg-green border-[3px] border-red' },
  { label: 'Réalisée', className: 'bg-indigo' },
  { label: 'Annulée / refusée', className: 'bg-line' },
] as const

/**
 * « Rencontres » (maquette W3-rencontres) : bandeau des rencontres passées encore confirmées, calendrier
 * mensuel (compact sur mobile), panneau de détail. URL : `?mois=AAAA-MM` et `?rencontre={id}`.
 */
export function MeetingsPage() {
  const now = useNow()
  const [params, setParams] = useSearchParams()
  const meetings = useFoundationMeetings()
  const all = meetings.data?.items ?? []
  const requested = params.get('rencontre')
  const selected = all.find((meeting) => meeting.id === requested) ?? defaultMeeting(all, now)
  const selectedStart = parseIso(selected?.startAt ?? null)
  const month = readMonthParam(params.get('mois'), selectedStart ?? now)
  const byDay = calendarEntries(all)
  const toMark = all.filter((meeting) => isToMark(meeting, now)).toSorted(byStart)
  const group =
    selected === undefined
      ? []
      : ([...byDay.values()].flat().find((entry) => entry.meetings.some((meeting) => meeting.id === selected.id))?.meetings ?? [selected])

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key)
      else next.set(key, value)
    }
    setParams(next, { replace: true })
  }

  function choose(meeting: FoundationMeeting) {
    const start = parseIso(meeting.startAt)
    update({ rencontre: meeting.id, mois: start ? monthParam(start) : null })
  }

  function changeMonth(delta: number) {
    update({ mois: monthParam(new Date(month.getFullYear(), month.getMonth() + delta, 1)) })
  }

  const isSelected = (entry: CalendarEntry) => selected !== undefined && entry.meetings.some((meeting) => meeting.id === selected.id)

  return (
    <div className="flex flex-col gap-3.5 lg:gap-[18px]">
      <PageTitle
        kicker="Suivi"
        mobileKicker="Suivi du programme"
        title="Rencontres"
        subtitle="Toutes les rencontres du programme. Après la séance, marquez-la « Réalisée » pour ouvrir les retours d'expérience."
      />

      {meetings.isPending ? (
        <div className="flex justify-center py-10 text-terra">
          <Spinner label="Chargement des rencontres…" size="lg" />
        </div>
      ) : meetings.isError ? (
        <ErrorState message={errorMessage(meetings.error)} onRetry={() => void meetings.refetch()} retrying={meetings.isFetching} />
      ) : (
        <>
          {meetings.data.truncated && (
            <Alert tone="warning">Toutes les rencontres n'ont pas pu être chargées : le calendrier est incomplet.</Alert>
          )}
          {toMark.length > 0 && (
            <section
              aria-label="Rencontres à marquer"
              className="flex flex-col gap-2 rounded-[18px] border-2 border-yellow bg-cream px-3.5 py-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-3 lg:rounded-[20px] lg:px-[18px] lg:py-3.5"
            >
              <p className="text-sm font-bold lg:flex-[1_1_300px] lg:text-[15px]">
                <strong className="font-black">
                  {toMark.length > 1 ? `${toMark.length} rencontres passées` : '1 rencontre passée'}
                </strong>
                <span className="lg:hidden"> à marquer.</span>
                <span className="hidden lg:inline">
                  {toMark.length > 1 ? ' sont encore « confirmées ».' : ' est encore « confirmée ».'} Ont-elles bien eu lieu ?
                </span>
              </p>
              <div className="flex flex-wrap gap-1.5 lg:gap-3">
                {toMark.map((meeting) => (
                  <button
                    key={meeting.id}
                    type="button"
                    onClick={() => choose(meeting)}
                    className="inline-flex min-h-touch items-center rounded-[12px] bg-ink px-3 text-xs font-black text-cream lg:px-3.5 lg:text-[13px]"
                  >
                    {toMarkLabel(meeting)}
                  </button>
                ))}
              </div>
            </section>
          )}

          <div className="flex flex-col gap-3.5 lg:flex-row lg:items-start lg:gap-5">
            <section aria-label="Calendrier" className="hidden min-w-0 flex-col gap-3.5 rounded-[24px] bg-surface p-5 lg:flex lg:flex-[3_1_620px]">
              <MonthNav month={month} onMonth={changeMonth} compact={false} />
              <MonthTable
                month={month}
                now={now}
                caption={`Calendrier de ${formatMonth(month)}`}
                className="border-spacing-1.5"
                headerClassName="text-xs font-black uppercase text-muted"
                cellClassName={(_day, { inMonth, isToday, isPast }) =>
                  cn(
                    'h-[108px] rounded-[12px] p-1.5 align-top',
                    !inMonth ? 'border-0 bg-transparent' : isToday ? 'border-2 border-terra' : 'border border-[#EDE6D6]',
                    inMonth && (isPast ? 'bg-[#F1EBDD]' : 'bg-surface'),
                  )
                }
                renderDay={(day, { key, inMonth, isToday, isPast }) => {
                  if (!inMonth) return null
                  const entries = byDay.get(key) ?? []
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
                      {entries.map((entry) => {
                        const look = meetingLook(entryStatusMeeting(entry), now)
                        const pressed = isSelected(entry)
                        return (
                          <button
                            key={entry.key}
                            type="button"
                            onClick={() => choose(entryStatusMeeting(entry))}
                            aria-pressed={pressed}
                            aria-label={entryAria(entry, now)}
                            className={cn(
                              'min-h-[34px] w-full overflow-hidden rounded-[8px] px-1.5 py-[3px] text-left text-[11px] font-extrabold leading-[1.2]',
                              look.chip,
                              pressed && 'outline-[3px] outline-offset-1 outline-ink outline',
                            )}
                          >
                            {entryText(entry)}
                          </button>
                        )
                      })}
                    </div>
                  )
                }}
              />
              <ul aria-label="Légende" className="flex flex-wrap gap-3.5 pt-1.5 text-xs font-extrabold text-muted">
                {LEGEND.map((item) => (
                  <li key={item.label} className="flex items-center gap-1.5">
                    <span aria-hidden="true" className={cn('size-3.5 rounded-[4px]', item.className)} />
                    {item.label}
                  </li>
                ))}
              </ul>
            </section>

            <section aria-label="Calendrier compact" className="flex flex-col gap-2.5 rounded-[22px] bg-surface p-3.5 lg:hidden">
              <MonthNav month={month} onMonth={changeMonth} compact />
              <CompactMonth
                month={month}
                now={now}
                caption={`Calendrier compact de ${formatMonth(month)}`}
                byDay={byDay}
                isSelected={isSelected}
                onSelect={(entry) => choose(entryStatusMeeting(entry))}
                dayHeightClassName="h-12"
                label={(day, entries) => {
                  const first = entries[0]
                  if (first === undefined) return String(day.getDate())
                  const more = entries.length > 1 ? ` et ${entries.length - 1} autre${entries.length > 2 ? 's' : ''}` : ''
                  return `${day.getDate()} : ${entryText(first)}, ${meetingLook(entryStatusMeeting(first), now).label}${more}`
                }}
                renderMarker={(entries) => (
                  <span className="flex items-center gap-0.5">
                    <span
                      aria-hidden="true"
                      className={cn('size-[9px] rounded-pill', entries[0] ? meetingLook(entryStatusMeeting(entries[0]), now).dot : '')}
                    />
                    {entries.length > 1 && <span className="text-[9px] font-black leading-none">{entries.length}</span>}
                  </span>
                )}
              />
              <ul aria-label="Légende du calendrier compact" className="flex flex-wrap gap-2.5 text-[11px] font-extrabold text-muted">
                {LEGEND.map((item) => (
                  <li key={item.label} className="flex items-center gap-1">
                    <span
                      aria-hidden="true"
                      className={cn('size-2.5 rounded-pill', item.label === 'À marquer' ? 'border-2 border-red bg-green' : item.label.startsWith('Annulée') ? 'bg-[#C9BFA8]' : item.className)}
                    />
                    {item.label}
                  </li>
                ))}
              </ul>
            </section>

            <div className="flex min-w-0 flex-col lg:flex-[2_1_320px]">
              {selected === undefined ? (
                <p className="rounded-[24px] bg-surface p-5 font-bold text-muted">Aucune rencontre pour l'instant.</p>
              ) : (
                <MeetingPanel
                  key={selected.id}
                  meeting={selected}
                  group={group}
                  now={now}
                  onPin={() => {
                    if (requested !== selected.id) update({ rencontre: selected.id })
                  }}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
