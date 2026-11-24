import { Link } from 'react-router'
import { schoolRequestPath } from '../../auth/roles'
import { buttonClass } from '../../components/ui/styles'
import { cn } from '../../lib/cn'
import { formatCompactDay, formatTime, parseIso } from '../../lib/dateTime'
import { initialsOf } from '../../lib/initials'
import type { SpeakerSummary } from './schoolData'
import { sectorName, sectorStyle } from './sectorStyle'

export function SpeakerAvatar({ speaker, size = 'md' }: { speaker: SpeakerSummary; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-pill font-display leading-none',
        size === 'lg' ? 'size-16 text-2xl' : size === 'sm' ? 'size-9 text-sm' : 'size-12 text-lg',
        sectorStyle(speaker.sector).avatar,
      )}
    >
      {initialsOf(speaker.fullName)}
    </span>
  )
}

/** « Lun 23 nov · 9h30 ». */
function nextSlotText(iso: string | null): string | null {
  const date = parseIso(iso)
  return date ? `${formatCompactDay(date)} · ${formatTime(date)}` : null
}

interface SpeakerCardProps {
  speaker: SpeakerSummary
  /** Ajoute « · {ville} » au libellé du secteur (section « Autres zones »). */
  showCity?: boolean
}

export function SpeakerCard({ speaker, showCity = false }: SpeakerCardProps) {
  const next = nextSlotText(speaker.nextSlotStartAt)
  const slots = speaker.availableSlotsCount
  const headingId = `intervenant-${speaker.id}`
  return (
    <article aria-labelledby={headingId} className="flex flex-col gap-3 rounded-[22px] bg-surface p-5 shadow-card">
      <div className="flex items-start gap-3">
        <SpeakerAvatar speaker={speaker} />
        <div className="min-w-0">
          <p className={cn('text-[13px] font-black', sectorStyle(speaker.sector).label)}>
            {sectorName(speaker.sector)}
            {showCity && speaker.city && ` · ${speaker.city}`}
          </p>
          <h3 id={headingId} className="text-xl leading-tight text-ink">
            {speaker.fullName}
          </h3>
          {speaker.jobTitle && <p className="font-semibold text-muted">{speaker.jobTitle}</p>}
        </div>
      </div>

      {speaker.skills.length > 0 && (
        <ul aria-label="Compétences" className="flex flex-wrap gap-1.5">
          {speaker.skills.slice(0, 3).map((skill) => (
            <li key={skill} className="rounded-pill bg-canvas px-3 py-1 text-[13px] font-extrabold text-ink">
              {skill}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-0.5 text-sm">
        {next ? (
          <>
            <p className="font-extrabold text-ink">Prochain créneau · {next}</p>
            <p className="font-semibold text-muted">
              {slots} créneau{slots > 1 ? 'x' : ''} libre{slots > 1 ? 's' : ''}
            </p>
          </>
        ) : (
          <p className="font-semibold text-muted">Aucun créneau libre pour l’instant</p>
        )}
      </div>

      <Link to={schoolRequestPath(speaker.id)} className={cn(buttonClass('primary', { size: 'md' }), 'mt-auto')}>
        Demander une rencontre{' '}
        <span className="sr-only">à {speaker.fullName}</span>
      </Link>
    </article>
  )
}
