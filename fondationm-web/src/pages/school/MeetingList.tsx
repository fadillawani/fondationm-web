import { useId, useState } from 'react'
import { cn } from '../../lib/cn'
import { parseIso } from '../../lib/dateTime'
import type { FeedbackState, SchoolMeeting } from './meetingsData'
import { STATUS_STYLE, clock, rowDate } from './meetingText'

interface MeetingListProps {
  title: string
  meetings: readonly SchoolMeeting[]
  feedback: ReadonlyMap<string, FeedbackState>
  selectedId: string | null
  onSelect: (meeting: SchoolMeeting) => void
  /** Repliable sur PC (« Passées », absente de la maquette PC), toujours ouverte sur mobile. */
  collapsible?: boolean
}

/** Listes « À venir » / « Passées » (maquette W1-E5 : point de statut, nom, date · heure · classe, statut). */
export function MeetingList({ title, meetings, feedback, selectedId, onSelect, collapsible = false }: MeetingListProps) {
  const [expanded, setExpanded] = useState(false)
  const contentId = useId()
  const headingId = useId()
  const open = !collapsible || expanded

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2 lg:gap-2.5 lg:rounded-[24px] lg:bg-surface lg:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 id={headingId} className="font-display text-[19px] uppercase text-ink lg:text-xl">
          {title}
        </h2>
        {collapsible && (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={contentId}
            onClick={() => setExpanded((value) => !value)}
            className="hidden min-h-touch items-center rounded-[12px] px-3 text-sm font-extrabold text-indigo underline lg:inline-flex"
          >
            {expanded ? 'Masquer' : 'Afficher'}{' '}
            <span className="sr-only">les rencontres {title.toLowerCase()}</span>
          </button>
        )}
      </div>
      <ul id={contentId} className={cn('flex-col gap-2', open ? 'flex' : 'flex lg:hidden')}>
        {meetings.length === 0 && (
          <li className="rounded-[14px] bg-surface px-3 py-3 text-sm font-bold text-muted lg:bg-canvas">Aucune rencontre.</li>
        )}
        {meetings.map((meeting) => {
          const start = parseIso(meeting.startAt)
          const style = STATUS_STYLE[meeting.status]
          const toShare = meeting.status === 'COMPLETED' && feedback.get(meeting.id) === 'À rédiger'
          const selected = meeting.id === selectedId
          return (
            <li key={meeting.id}>
              <button
                type="button"
                onClick={() => onSelect(meeting)}
                aria-current={selected || undefined}
                className={cn(
                  'flex min-h-14 w-full items-center gap-2.5 rounded-[14px] px-3 py-2 text-left text-ink lg:min-h-[52px] lg:rounded-[12px] lg:px-2.5',
                  selected ? 'bg-cream' : 'bg-surface lg:bg-canvas',
                )}
              >
                <span aria-hidden="true" className={cn('size-2.5 shrink-0 rounded-pill', style.dot)} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-black">{meeting.speakerName}</span>
                  <span className="truncate text-xs font-bold text-muted">
                    {[start ? rowDate(start) : null, start ? clock(start) : null, meeting.classTitle || null]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <span
                  className={cn(
                    'whitespace-nowrap text-[11px] font-black lg:text-xs lg:font-extrabold',
                    toShare ? 'text-terra' : 'text-muted',
                  )}
                >
                  {toShare ? 'Retour à partager' : style.label}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
