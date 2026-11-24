import { Link } from 'react-router'
import { parseIso } from '../../lib/dateTime'
import type { SchoolMeeting } from './meetingsData'
import { meetingLink } from './meetingText'

const SHORT_DATE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })

/** « 19 nov » (maquette, sans point d'abréviation). */
function shortDate(iso: string): string | null {
  const date = parseIso(iso)
  return date ? SHORT_DATE.format(date).replace('.', '') : null
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true" className="size-[18px]">
      <path d="M12 7v6" />
      <path d="M12 17h.01" />
    </svg>
  )
}

/** Bandeau « votre demande a été refusée par l'intervenant » (maquette W1-E3, PC et mobile). */
export function RefusalBanner({ meeting }: { meeting: SchoolMeeting }) {
  const context = [meeting.classTitle, shortDate(meeting.startAt)].filter(Boolean).join(', ')
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-red bg-surface px-3.5 py-3 lg:px-[18px] lg:py-3.5"
    >
      <span aria-hidden="true" className="inline-flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-red text-white">
        <AlertIcon />
      </span>
      <p className="hidden flex-1 text-sm font-bold text-ink lg:block">
        Votre demande à <strong className="font-black">{meeting.speakerName}</strong>
        {context && ` (${context})`} a été <strong className="font-black">refusée par l'intervenant</strong>. Choisissez un
        autre intervenant pour cette classe.
      </p>
      <p className="flex-1 text-[13px] font-bold text-ink lg:hidden">
        <strong className="font-black">{meeting.speakerName}</strong> a refusé votre demande
        {meeting.classTitle ? ` pour la ${meeting.classTitle}` : ''}.
      </p>
      <Link to={meetingLink(meeting)} className="inline-flex min-h-touch items-center text-sm font-black text-indigo underline">
        Voir la demande
      </Link>
    </div>
  )
}
