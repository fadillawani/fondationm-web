import { formatMonth } from '../../lib/dateTime'

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-[18px]">
      <path d={direction === 'left' ? 'm15 6-6 6 6 6' : 'm9 6 6 6-6 6'} />
    </svg>
  )
}

/**
 * Navigation de mois des calendriers (maquettes W2-E8, W1-E5) : boutons icône 44 px rayon 12
 * (PC : bordure 2 px `#E6DECB` ; compact : fond `#F7F3EA`), mois en Lilita 26 (compact 21).
 */
export function MonthNav({ month, onMonth, compact }: { month: Date; onMonth: (delta: number) => void; compact: boolean }) {
  const button = compact
    ? 'inline-flex size-11 items-center justify-center rounded-[12px] bg-canvas text-ink'
    : 'inline-flex size-11 items-center justify-center rounded-[12px] border-2 border-line bg-surface text-ink'
  return (
    <div className="flex items-center justify-between gap-3">
      <button type="button" aria-label="Mois précédent" onClick={() => onMonth(-1)} className={button}>
        <Chevron direction="left" />
      </button>
      <h2 aria-live="polite" className={compact ? 'text-[21px] text-ink' : 'text-[26px] text-ink'}>
        {formatMonth(month)}
      </h2>
      <button type="button" aria-label="Mois suivant" onClick={() => onMonth(1)} className={button}>
        <Chevron direction="right" />
      </button>
    </div>
  )
}
