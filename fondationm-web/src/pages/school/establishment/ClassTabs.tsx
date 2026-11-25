import { useRef, type KeyboardEvent } from 'react'
import { panelId, tabId } from '../../../components/ui/tabIds'
import { cn } from '../../../lib/cn'
import type { ManagedClass } from '../classes/classData'

export const CLASS_TABS_ID = 'classes'

interface ClassTabsProps {
  classes: readonly ManagedClass[]
  selected: string | null
  onSelect: (id: string) => void
  onCreate: () => void
  creating: boolean
}

/**
 * Onglets de classe (maquette W5-E2) : « Terminale S2 · 10 » (élèves rattachés, F6-Q4) ; PC 48 px rayon 14,
 * 15 px / 900, mobile 44 px rayon 12, 14 px ; actif encre / blanc, inactif blanc bordure `#E6DECB`.
 * Flèches, Début et Fin déplacent l'onglet actif. « + Nouvelle classe » est un bouton hors de la liste d'onglets.
 */
export function ClassTabs({ classes, selected, onSelect, onCreate, creating }: ClassTabsProps) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})

  function move(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = classes.length - 1
    let next: number | null = null
    if (event.key === 'ArrowRight') next = index === last ? 0 : index + 1
    if (event.key === 'ArrowLeft') next = index === 0 ? last : index - 1
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = last
    const target = next === null ? undefined : classes[next]
    if (target === undefined) return
    event.preventDefault()
    onSelect(target.id)
    refs.current[target.id]?.focus()
  }

  const tab = 'inline-flex min-h-touch shrink-0 items-center whitespace-nowrap rounded-[12px] border-2 px-3.5 text-sm font-black lg:min-h-12 lg:rounded-[14px] lg:px-4 lg:text-[15px]'

  return (
    <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:gap-2 lg:overflow-visible lg:px-0 lg:pb-0">
      {classes.length > 0 && (
        <div role="tablist" aria-label="Classe" className="flex gap-1.5 lg:flex-wrap lg:gap-2">
          {classes.map((cls, index) => {
            const active = cls.id === selected
            return (
              <button
                key={cls.id}
                ref={(node) => {
                  refs.current[cls.id] = node
                }}
                type="button"
                role="tab"
                id={tabId(CLASS_TABS_ID, cls.id)}
                aria-selected={active}
                aria-controls={panelId(CLASS_TABS_ID)}
                tabIndex={active ? 0 : -1}
                onClick={() => onSelect(cls.id)}
                onKeyDown={(event) => move(event, index)}
                className={cn(tab, active ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-ink hover:border-muted')}
              >
                {cls.title}{' '}
                {/* Opacité 0,8 de la maquette : 8,9:1 sur blanc, 13,1:1 sur encre. */}
                <span className="ml-1 font-bold opacity-80">· {cls.accountsCount}</span>
              </button>
            )
          })}
        </div>
      )}
      <button
        type="button"
        onClick={onCreate}
        aria-expanded={creating}
        className={cn(tab, 'border-dashed border-[#C9BFA8] bg-transparent text-ink hover:border-muted')}
      >
        + Nouvelle classe
      </button>
    </div>
  )
}
