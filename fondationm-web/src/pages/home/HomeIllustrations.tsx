import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

/**
 * Illustrations de la vitrine (F14, décisions 145 et 147) : SVG en ligne, formes géométriques aux couleurs du thème,
 * sans visage ni détail qui évoque une personne réelle ; toutes décoratives (`aria-hidden`). Les animations (classes
 * `vitrine-*` de `styles/theme.css`) ne portent que sur `transform` et sont coupées par `prefers-reduced-motion`.
 */

/** Hero : une grande figure tend un fil qui se tisse autour de trois jeunes. Le fil se dessine une fois à l'arrivée. */
export function HeroIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 440 360" aria-hidden="true" focusable="false" className={className}>
      <defs>
        <clipPath id="vitrine-fil">
          <rect className="vitrine-draw" x="200" y="100" width="240" height="220" />
        </clipPath>
      </defs>
      <path className="fill-cream" d="M44 278C8 200 40 78 150 44s252 6 266 118-62 170-188 170S66 330 44 278Z" />
      <circle className="fill-yellow" cx="372" cy="70" r="30" />
      <circle className="fill-indigo" cx="64" cy="96" r="10" />
      <circle className="fill-green" cx="404" cy="250" r="8" />
      <path className="fill-orange" d="M30 196l14-24 14 24Z" />
      {/* Livres posés au sol */}
      <rect className="fill-indigo" x="70" y="300" width="70" height="12" rx="3" />
      <rect className="fill-green" x="78" y="288" width="56" height="12" rx="3" />
      {/* Figure adulte */}
      <circle className="fill-terra-dark" cx="140" cy="100" r="32" />
      <path className="fill-terra" d="M86 312V210c0-34 24-58 54-58s54 24 54 58v102Z" />
      <path className="stroke-terra" fill="none" strokeWidth="20" strokeLinecap="round" d="M182 196l48-38" />
      <circle className="fill-terra-dark" cx="236" cy="152" r="12" />
      {/* Jeunes (balancement lent, décalé) */}
      <g className="vitrine-sway">
        <circle className="fill-orange" cx="272" cy="226" r="21" />
        <path className="fill-orange" d="M242 312v-40c0-18 13-31 30-31s30 13 30 31v40Z" />
      </g>
      <g className="vitrine-sway [animation-delay:-1.1s]">
        <circle className="fill-indigo" cx="332" cy="214" r="21" />
        <path className="fill-indigo" d="M302 312v-50c0-18 13-31 30-31s30 13 30 31v50Z" />
      </g>
      <g className="vitrine-sway [animation-delay:-2.2s]">
        <circle className="fill-green" cx="390" cy="234" r="19" />
        <path className="fill-green" d="M364 312v-34c0-16 11-28 26-28s26 12 26 28v34Z" />
      </g>
      {/* Fil qui tisse */}
      <g clipPath="url(#vitrine-fil)">
        <path
          className="stroke-yellow"
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          d="M236 152c34-12 46 46 36 74s-34 46 0 58 56-70 62-70 12 80 34 70 34-58 24-58"
        />
      </g>
      <path className="stroke-ink" fill="none" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 10" d="M60 326h340" />
    </svg>
  )
}

/** Grandes formes douces derrière le hero, à droite (PC) : jamais sous le texte. */
export function HeroBackdrop({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 560" aria-hidden="true" focusable="false" className={className}>
      <circle className="fill-indigo" cx="560" cy="80" r="120" />
      <circle className="fill-yellow" cx="430" cy="40" r="46" />
      <path className="fill-terra" d="M600 560H480a120 120 0 0 1 120-120Z" />
      <circle className="fill-green" cx="96" cy="536" r="18" />
    </svg>
  )
}

const WAVE = 'c20-12 40-12 60 0s40 12 60 0'
const WAVE_INVERSE = 'c20 12 40 12 60 0s40-12 60 0'

/** Huit ondes de 120 unités : le motif glisse d'une moitié (480) sans couture. */
function weavePath(wave: string) {
  return `M0 14${wave.repeat(8)}`
}

/** Bande « fil tissé » : deux fils qui se croisent ; ils glissent lentement (motif répété, contenu par le cadre). */
export function WeaveBand({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  return (
    <div aria-hidden="true" className={cn('h-7 w-full overflow-hidden', className)}>
      <svg viewBox="0 0 960 28" preserveAspectRatio="none" aria-hidden="true" focusable="false" className="vitrine-slide h-7 w-[200%] max-w-none">
        <path className={onDark ? 'stroke-orange' : 'stroke-terra'} fill="none" strokeWidth="4" vectorEffect="non-scaling-stroke" d={weavePath(WAVE)} />
        <path className="stroke-yellow" fill="none" strokeWidth="4" vectorEffect="non-scaling-stroke" d={weavePath(WAVE_INVERSE)} />
      </svg>
    </div>
  )
}

function Pictogram({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn('size-8', className)}
    >
      {children}
    </svg>
  )
}

/** Pictogrammes au trait (style de la maquette, 24 × 24). */
const PICTOGRAMS = {
  signup: (
    <Pictogram>
      <path d="M12 3l2.4 1.8 3 .1.9 2.9 2.2 2-1 2.8 1 2.8-2.2 2-.9 2.9-3 .1L12 21l-2.4-1.8-3-.1-.9-2.9-2.2-2 1-2.8-1-2.8 2.2-2 .9-2.9 3-.1Z" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </Pictogram>
  ),
  calendar: (
    <Pictogram>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4M8 14h3" />
    </Pictogram>
  ),
  meeting: (
    <Pictogram>
      <circle cx="7" cy="7.5" r="2.5" />
      <circle cx="17" cy="7.5" r="2.5" />
      <path d="M3 20v-3.5A4 4 0 0 1 7 12.5a4 4 0 0 1 4 4V20M13 20v-3.5a4 4 0 0 1 4-4 4 4 0 0 1 4 4V20" />
    </Pictogram>
  ),
  story: (
    <Pictogram>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-5 4.5V16a1 1 0 0 1-1-1Z" />
      <path d="M8.5 8.5h7M8.5 12h4" />
    </Pictogram>
  ),
  school: (
    <Pictogram>
      <path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6" />
    </Pictogram>
  ),
  speaker: (
    <Pictogram>
      <rect x="3" y="7" width="18" height="13" rx="2.5" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 13h18" />
    </Pictogram>
  ),
  student: (
    <Pictogram>
      <path d="M6 8a6 6 0 0 1 12 0v12H6Z" />
      <path d="M9 20v-6h6v6M9 8h6" />
    </Pictogram>
  ),
  donor: (
    <Pictogram>
      <path d="M12 10.5S8 8 8 5.8A2.3 2.3 0 0 1 12 4.5a2.3 2.3 0 0 1 4 1.3C16 8 12 10.5 12 10.5Z" />
      <path d="M3 14h3l3.5 2h4a1.5 1.5 0 0 1 0 3H9M14 17.5l4.5-2.5a1.6 1.6 0 0 1 2 2.4L15 21H3" />
    </Pictogram>
  ),
  foundation: (
    <Pictogram>
      <path d="M7 4h10M7 20h10M8.5 4v16M15.5 4v16" />
      <path d="M8.5 8l7 3-7 3 7 3" />
    </Pictogram>
  ),
} as const

export type PictogramName = keyof typeof PICTOGRAMS

export function HomePictogram({ name }: { name: PictogramName }) {
  return PICTOGRAMS[name]
}
