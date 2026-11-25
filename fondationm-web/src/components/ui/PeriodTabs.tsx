import { useRef, type KeyboardEvent } from 'react'
import { cn } from '../../lib/cn'
import { PERIODS, PERIOD_LABEL, type PeriodKind } from '../../lib/period'

interface PeriodTabsProps {
  value: PeriodKind
  onChange: (kind: PeriodKind) => void
  /** Identifiant du panneau que les onglets commandent. */
  panelId: string
  /** 'light' : fond blanc (F8) ; 'dark' : sur fond sombre, onglet actif crème (en-tête mobile du donateur). */
  tone?: 'light' | 'dark'
}

/** Sélecteur « Ce trimestre / Cette année » (contrôle segmenté des maquettes) : onglets, flèches. */
export function PeriodTabs({ value, onChange, panelId, tone = 'light' }: PeriodTabsProps) {
  const refs = useRef<Partial<Record<PeriodKind, HTMLButtonElement | null>>>({})
  function move(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (delta === 0) return
    event.preventDefault()
    const next = PERIODS[(index + delta + PERIODS.length) % PERIODS.length]
    if (next === undefined) return
    onChange(next)
    refs.current[next]?.focus()
  }
  return (
    <div role="tablist" aria-label="Période" className={cn('flex gap-1 self-start rounded-[14px] p-1', tone === 'light' ? 'bg-surface' : 'bg-ink')}>
      {PERIODS.map((kind, index) => {
        const active = kind === value
        return (
          <button
            key={kind}
            ref={(node) => {
              refs.current[kind] = node
            }}
            type="button"
            role="tab"
            id={`periode-${kind}`}
            aria-selected={active}
            aria-controls={panelId}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(kind)}
            onKeyDown={(event) => move(event, index)}
            className={cn(
              'min-h-touch rounded-[10px] px-3.5 text-sm font-black',
              tone === 'light' ? (active ? 'bg-ink text-cream' : 'text-ink') : active ? 'bg-cream text-ink' : 'text-white',
            )}
          >
            {PERIOD_LABEL[kind]}
          </button>
        )
      })}
    </div>
  )
}
