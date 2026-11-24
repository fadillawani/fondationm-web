import { Link } from 'react-router'
import { cn } from '../../lib/cn'
import { parseIso } from '../../lib/dateTime'
import { initialsOf } from '../../lib/initials'
import type { FeedbackState, SchoolMeeting } from './meetingsData'
import {
  DECISION_STYLE,
  FEEDBACK_STYLE,
  STATUS_STYLE,
  decisions,
  detailDate,
  meetingNote,
  placeLabel,
  type Decision,
} from './meetingText'

interface MeetingDetailProps {
  meeting: SchoolMeeting
  /** Métier de l'intervenant (fiche de l'annuaire), absent du contrat des rencontres. */
  jobTitle: string | null
  feedback: FeedbackState | undefined
  upcoming: boolean
}

function DecisionBox({ who, value }: { who: string; value: Decision }) {
  return (
    <div className={cn('flex flex-col rounded-[12px] px-2.5 py-2 lg:p-2.5', DECISION_STYLE[value])}>
      <span className="text-[10px] font-black uppercase lg:text-[11px]">{who}</span>
      <span className="text-[13px] font-black lg:text-sm">{value}</span>
    </div>
  )
}

/** Détail de la rencontre sélectionnée (maquette W1-E5, colonne de droite / sous le calendrier). */
export function MeetingDetail({ meeting, jobTitle, feedback, upcoming }: MeetingDetailProps) {
  const style = STATUS_STYLE[meeting.status]
  const start = parseIso(meeting.startAt)
  const note = meetingNote(meeting, feedback)
  const decision = decisions(meeting)
  const who = [jobTitle, meeting.speakerCity].filter(Boolean).join(' · ')
  const place = placeLabel(meeting)

  return (
    <section
      aria-live="polite"
      aria-label="Détail de la rencontre"
      className={cn('flex flex-col gap-3 rounded-[22px] border-2 bg-surface p-4 lg:gap-3.5 lg:rounded-[24px] lg:p-[22px]', style.accent)}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-black uppercase tracking-[0.08em] text-muted lg:text-xs lg:tracking-[0.1em]">
          {upcoming ? 'Rencontre à venir' : 'Rencontre passée'}
        </span>
        <span className={cn('rounded-pill px-2.5 py-1 text-xs font-black', style.chip)}>{style.label}</span>
      </div>

      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="hidden size-[52px] shrink-0 items-center justify-center rounded-2xl bg-canvas font-display text-[19px] text-ink lg:inline-flex"
        >
          {initialsOf(meeting.speakerName)}
        </span>
        <div className="flex min-w-0 flex-col">
          <h2 className="font-display text-[21px] leading-[1.1] text-ink lg:text-[22px]">{meeting.speakerName}</h2>
          {who && <span className="text-[13px] font-bold text-muted">{who}</span>}
        </div>
      </div>

      <dl className="grid grid-cols-[64px_1fr] gap-x-3 gap-y-1.5 text-sm">
        <dt className="font-bold text-muted">Date</dt>
        <dd className="font-black">{start ? detailDate(start) : '—'}</dd>
        <dt className="font-bold text-muted">Classe</dt>
        <dd className="font-black">{meeting.classTitle || '—'}</dd>
        <dt className="font-bold text-muted">Lieu</dt>
        <dd className="font-black">{place ?? '—'}</dd>
      </dl>

      <div className="grid grid-cols-2 gap-2">
        <DecisionBox who="Intervenant" value={decision.speaker} />
        <DecisionBox who="Fondation M" value={decision.foundation} />
      </div>

      <div className="flex flex-col gap-1 rounded-[14px] bg-canvas px-3.5 py-3">
        <span className="text-[13px] font-black">{note.title}</span>
        {note.mobileText ? (
          <>
            <span className="hidden text-sm font-semibold leading-[1.45] lg:block">{note.text}</span>
            <span className="text-[13px] font-semibold leading-[1.45] lg:hidden">{note.mobileText}</span>
          </>
        ) : (
          <span className="text-[13px] font-semibold leading-[1.45] lg:text-sm">{note.text}</span>
        )}
      </div>

      {feedback && meeting.status === 'COMPLETED' && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-extrabold">Retour d'expérience</span>
          <span className={cn('rounded-pill px-2.5 py-1 text-xs font-black', FEEDBACK_STYLE[feedback])}>{feedback}</span>
        </div>
      )}

      {note.cta &&
        (note.cta.to === null ? (
          <span className="flex min-h-[50px] cursor-not-allowed items-center justify-center gap-2 rounded-[14px] bg-terra px-3 text-center font-display text-[17px] text-white lg:min-h-[52px] lg:rounded-2xl lg:text-lg"
          >
            {note.cta.label}
            <span className="rounded-pill bg-white px-2 py-0.5 font-sans text-[11px] font-black uppercase text-terra">Bientôt</span>
          </span>
        ) : (
          <Link
            to={note.cta.to}
            className="flex min-h-[50px] items-center justify-center rounded-[14px] bg-terra px-3 text-center font-display text-[17px] text-white lg:min-h-[52px] lg:rounded-2xl lg:text-lg"
          >
            {note.cta.label}
          </Link>
        ))}
    </section>
  )
}
