import { cn } from '../../../lib/cn'
import type { FoundationMeeting } from './foundationMeetingsData'
import { LATE_AFTER_DAYS, decisionLook, plural, requestBadge, slotShort, waitingDays } from './foundationMeetingState'

interface RequestListProps {
  label: string
  meetings: readonly FoundationMeeting[]
  selectedId: string | null
  now: Date
  onSelect: (meeting: FoundationMeeting) => void
}

/** Cartes-boutons de la liste (maquette W3-demandes : rayon 18, bordure 2 px encre à la sélection). */
export function RequestList({ label, meetings, selectedId, now, onSelect }: RequestListProps) {
  return (
    <ul aria-label={label} className="flex flex-col gap-2.5">
      {meetings.map((meeting) => {
        const badge = requestBadge(meeting)
        const speaker = decisionLook(meeting.speakerDecision)
        const days = waitingDays(meeting, now)
        const late = days !== null && days >= LATE_AFTER_DAYS
        const selected = meeting.id === selectedId
        return (
          <li key={meeting.id}>
            <button
              type="button"
              onClick={() => onSelect(meeting)}
              aria-pressed={selected}
              className={cn(
                'flex w-full flex-col gap-[5px] rounded-[18px] border-2 bg-surface p-3.5 text-left text-ink lg:gap-1.5 lg:px-4',
                selected ? 'lg:border-ink' : 'border-transparent',
                'max-lg:border-transparent',
              )}
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span className="text-xs font-black uppercase text-terra">{slotShort(meeting)}</span>
                <span className={cn('whitespace-nowrap rounded-pill px-2 py-[3px] text-[11px] font-black lg:px-[9px]', badge.className)}>
                  {badge.label}
                </span>
              </span>
              <span className="font-display text-[17px] leading-[1.15] lg:text-lg">
                {meeting.schoolName} → {meeting.speakerName}
              </span>
              <span className="text-xs font-bold text-muted lg:text-[13px]">
                {meeting.classTitle}
                <span className="hidden lg:inline">{meeting.schoolCity && ` · ${meeting.schoolCity}`}</span>
              </span>
              <span className="flex flex-wrap gap-2.5 text-xs font-extrabold">
                <span>
                  Intervenant : <span className={speaker.text}>{speaker.label}</span>
                </span>
                {late && days !== null && (
                  <span className="text-red">
                    <span className="hidden lg:inline">En attente </span>
                    depuis {plural(days, 'jour', 'jours')}
                  </span>
                )}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
