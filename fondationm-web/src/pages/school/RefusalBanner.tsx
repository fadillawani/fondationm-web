import { formatDayInline, parseIso } from '../../lib/dateTime'
import type { RefusedMeeting } from './schoolData'

interface RefusalBannerProps {
  meeting: RefusedMeeting
}

/** Bandeau « votre demande a été refusée par l'intervenant » (texte long sur PC, court sur téléphone). */
export function RefusalBanner({ meeting }: RefusalBannerProps) {
  const slot = parseIso(meeting.slotStartAt)
  const context = [meeting.classTitle, slot ? formatDayInline(slot) : null].filter(Boolean).join(', ')
  return (
    <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-block border-l-[6px] border-red bg-red-tint px-4 py-3 text-red">
      <p className="hidden font-bold md:block">
        Votre demande à {meeting.speakerName}
        {context && ` (${context})`} a été refusée par l'intervenant. Choisissez un autre intervenant pour cette classe.
      </p>
      <p className="font-bold md:hidden">
        {meeting.speakerName} a refusé votre demande{meeting.classTitle ? ` pour la ${meeting.classTitle}` : ''}.
      </p>
      <span className="inline-flex min-h-touch items-center gap-2 font-extrabold text-red">
        Voir la demande
        <span className="rounded-pill bg-white px-2 py-0.5 text-[11px] font-black uppercase text-red">Bientôt</span>
      </span>
    </div>
  )
}
