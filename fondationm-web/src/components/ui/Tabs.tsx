import { useRef, type KeyboardEvent } from 'react'
import { cn } from '../../lib/cn'
import { panelId, tabId } from './tabIds'

export interface TabItem<T extends string> {
  value: T
  label: string
}

interface TabsProps<T extends string> {
  label: string
  items: readonly TabItem<T>[]
  value: T
  onChange: (value: T) => void
  /** Préfixe des identifiants : onglet `${idPrefix}-onglet-${value}`, panneau `${idPrefix}-panneau`. */
  idPrefix: string
  /** 'md' : 44 px, 14 px (comptes) ; 'sm' : 40 px, 13 px (demandes). */
  size?: 'md' | 'sm'
}

/** Onglets ARIA (activation automatique, flèches, Début / Fin), en pastilles défilantes. */
export function Tabs<T extends string>({ label, items, value, onChange, idPrefix, size = 'md' }: TabsProps<T>) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})

  function move(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = items.length - 1
    let next: number | null = null
    if (event.key === 'ArrowRight') next = index === last ? 0 : index + 1
    if (event.key === 'ArrowLeft') next = index === 0 ? last : index - 1
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = last
    const target = next === null ? undefined : items[next]
    if (target === undefined) return
    event.preventDefault()
    onChange(target.value)
    refs.current[target.value]?.focus()
  }

  return (
    <div role="tablist" aria-label={label} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
      {items.map((item, index) => {
        const selected = item.value === value
        return (
          <button
            key={item.value}
            ref={(node) => {
              refs.current[item.value] = node
            }}
            type="button"
            role="tab"
            id={tabId(idPrefix, item.value)}
            aria-selected={selected}
            aria-controls={panelId(idPrefix)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.value)}
            onKeyDown={(event) => move(event, index)}
            className={cn(
              'inline-flex shrink-0 items-center whitespace-nowrap rounded-pill border-2 font-black transition-colors',
              size === 'md' ? 'min-h-touch px-4 text-sm' : 'min-h-10 px-3.5 text-[13px]',
              selected ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-ink hover:border-muted',
            )}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
