import { Link } from 'react-router'
import { feedbackFormPath } from '../../auth/roles'
import { initialsOf } from '../../lib/initials'
import type { SchoolMeeting } from './meetingsData'
import { clockInSentence, sentenceDate, whenLabel } from './meetingText'

interface NextMeetingBannerProps {
  meeting: SchoolMeeting
  start: Date
  now: Date
  jobTitle: string | null
  onShow: () => void
}

/** Bandeau « Dans {n} jours · {Nom}, {métier}, rencontre vos {classe} {date} à {heure}. » (PC, maquette). */
export function NextMeetingBanner({ meeting, start, now, jobTitle, onShow }: NextMeetingBannerProps) {
  const job = jobTitle ? `, ${jobTitle.charAt(0).toLocaleLowerCase('fr-FR')}${jobTitle.slice(1)}` : ''
  const classe = meeting.classTitle ? ` vos ${meeting.classTitle}` : ' votre classe'
  return (
    <section
      role="status"
      aria-label="Prochaine rencontre"
      className="hidden flex-wrap items-center gap-3.5 rounded-[20px] bg-green px-5 py-4 text-white lg:flex"
    >
      <span
        aria-hidden="true"
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-cream font-display text-[17px] text-green"
      >
        {initialsOf(meeting.speakerName)}
      </span>
      <p className="min-w-[300px] flex-1 text-base font-bold leading-[1.4]">
        <strong className="font-black text-cream">{whenLabel(start, now)}</strong> · {meeting.speakerName}
        {job}, rencontre{classe} {sentenceDate(start)} à {clockInSentence(start)}.
      </p>
      <button
        type="button"
        onClick={onShow}
        className="min-h-touch rounded-[12px] border-2 border-cream bg-transparent px-4 text-sm font-black text-cream"
      >
        Voir le détail
      </button>
    </section>
  )
}

/** Bandeau « Votre rencontre avec {intervenant} est terminée. » (retour à rédiger). */
export function FeedbackBanner({ meeting }: { meeting: SchoolMeeting }) {
  const classe = meeting.classTitle ? ` et vos ${meeting.classTitle}` : ''
  return (
    <section
      role="status"
      aria-label="Rencontre terminée"
      className="flex flex-col gap-2.5 rounded-[18px] border-2 border-yellow bg-cream p-3.5 lg:flex-row lg:flex-wrap lg:items-center lg:gap-3.5 lg:rounded-[20px] lg:px-5 lg:py-4"
    >
      <span
        aria-hidden="true"
        className="hidden size-11 shrink-0 items-center justify-center rounded-[14px] bg-orange font-display text-[17px] text-ink lg:inline-flex"
      >
        {initialsOf(meeting.speakerName)}
      </span>
      <p className="flex-1 text-sm font-bold leading-[1.4] text-ink lg:min-w-[300px] lg:text-base">
        <strong className="font-black">Votre rencontre avec {meeting.speakerName} est terminée.</strong>{' '}
        <span className="hidden lg:inline">Comment s'est-elle passée pour vous{classe} ?</span>
        <span className="lg:hidden">Comment s'est-elle passée ?</span>
      </p>
      <Link
        to={feedbackFormPath('school', meeting.id)}
        className="flex min-h-[46px] items-center justify-center gap-2 rounded-[14px] bg-terra px-[18px] text-[15px] font-black text-white lg:min-h-touch lg:rounded-[12px] lg:text-sm"
      >
        Partager mon retour
      </Link>
    </section>
  )
}
