import { Link } from 'react-router'
import { schoolRequestPath } from '../../auth/roles'
import { cn } from '../../lib/cn'
import { formatCompactDay, formatTime, parseIso } from '../../lib/dateTime'
import { initialsOf } from '../../lib/initials'
import { Avatar } from '../../components/ui/Avatar'
import type { SpeakerSummary } from './schoolData'
import { sectorName, sectorStyle } from './sectorStyle'

const AVATAR_SIZES = {
  xs: 'size-8 rounded-[10px] text-xs',
  sm: 'size-10 rounded-[12px] text-[15px]',
  md: 'size-12 rounded-[14px] text-lg lg:size-[52px] lg:rounded-2xl lg:text-xl',
  lg: 'size-14 rounded-[18px] text-[22px] lg:size-[72px] lg:rounded-[22px] lg:text-[28px]',
} as const

/** Avatar d'initiales aux couleurs du secteur (maquette : carré arrondi). */
export function SpeakerAvatar({
  speaker,
  size = 'md',
  className,
}: {
  speaker: SpeakerSummary
  size?: keyof typeof AVATAR_SIZES
  className?: string
}) {
  return (
    <Avatar
      photoUrl={speaker.photoUrl}
      kind="photo"
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-display leading-none',
        AVATAR_SIZES[size],
        sectorStyle(speaker.sector).avatar,
        className,
      )}
    >
      {initialsOf(speaker.fullName)}
    </Avatar>
  )
}

/** « Lun 23 nov · 9h30 ». */
function nextSlotLabel(iso: string | null): string | null {
  const date = parseIso(iso)
  return date ? `${formatCompactDay(date)} · ${formatTime(date)}` : null
}

interface SpeakerCardProps {
  speaker: SpeakerSummary
  /** Ajoute « · {ville} » au libellé du secteur (section « Autres zones »). */
  showCity?: boolean
}

/** Carte d'intervenant (maquette W1-E3 : rayon 22, padding 18, avatar 52 px rayon 16). */
export function SpeakerCard({ speaker, showCity = false }: SpeakerCardProps) {
  const next = nextSlotLabel(speaker.nextSlotStartAt)
  const slots = speaker.availableSlotsCount
  const headingId = `intervenant-${speaker.id}`
  return (
    <article aria-labelledby={headingId} className="flex flex-col gap-3 rounded-[20px] bg-surface p-4 lg:rounded-[22px] lg:p-[18px]">
      <div className="flex items-start gap-3">
        <SpeakerAvatar speaker={speaker} />
        <div className="min-w-0">
          <p className={cn('text-[11px] font-black uppercase tracking-[0.08em]', sectorStyle(speaker.sector).label)}>
            {sectorName(speaker.sector)}
            {showCity && speaker.city && ` · ${speaker.city}`}
          </p>
          <h3 id={headingId} className="text-[19px] leading-tight text-ink lg:text-xl">
            {speaker.fullName}
          </h3>
          {speaker.jobTitle && <p className="text-[13px] font-bold text-muted">{speaker.jobTitle}</p>}
        </div>
      </div>

      {speaker.skills.length > 0 && (
        <ul aria-label="Compétences" className="flex flex-wrap gap-1.5">
          {speaker.skills.slice(0, 3).map((skill) => (
            <li key={skill} className="rounded-pill bg-canvas px-2.5 py-1 text-xs font-extrabold text-ink">
              {skill}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-black uppercase tracking-[0.06em] text-muted lg:text-xs">Prochain créneau</span>
        {next ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-[10px] bg-cream px-2.5 py-1.5 text-[13px] font-extrabold text-ink">{next}</span>
            <span className="text-xs font-bold text-muted">
              {slots} créneau{slots > 1 ? 'x' : ''} libre{slots > 1 ? 's' : ''}
            </span>
          </div>
        ) : (
          <span className="text-sm font-semibold text-muted">Aucun créneau libre pour l’instant</span>
        )}
      </div>

      <Link
        to={schoolRequestPath(speaker.id)}
        aria-label={`Demander une rencontre à ${speaker.fullName}`}
        className="mt-auto inline-flex min-h-touch items-center justify-center rounded-[14px] bg-terra px-4 font-display text-base text-white lg:min-h-[46px] lg:text-[17px]"
      >
        <span className="lg:hidden">Demander</span>
        <span className="hidden lg:inline">Demander une rencontre</span>
      </Link>
    </article>
  )
}

/** Ligne compacte mobile de « Autres zones · en ligne » (maquette W1-E3-mobile). */
export function SpeakerRow({ speaker }: { speaker: SpeakerSummary }) {
  const next = parseIso(speaker.nextSlotStartAt)
  const line = [speaker.jobTitle, speaker.city, next ? formatCompactDay(next) : null].filter(Boolean).join(' · ')
  return (
    <li className="flex items-center gap-3 rounded-[20px] bg-surface p-4">
      <SpeakerAvatar speaker={speaker} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-display text-lg leading-tight text-ink">{speaker.fullName}</span>
        {line && <span className="truncate text-xs font-bold text-muted">{line}</span>}
      </div>
      <Link
        to={schoolRequestPath(speaker.id)}
        aria-label={`Demander une rencontre avec ${speaker.fullName}`}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] border-2 border-terra text-terra"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true" className="size-5">
          <path d="m9 6 6 6-6 6" />
        </svg>
      </Link>
    </li>
  )
}
