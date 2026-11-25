import { cn } from '../../lib/cn'

interface ChoiceGroupProps<T extends string> {
  label: string
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  /** 'filter' : pastilles 40 px, 13 px, active encre / blanc sans bordure (W1-E3). */
  look?: 'default' | 'filter'
}

/** Choix unique en pastilles (boutons à bascule). */
export function ChoiceGroup<T extends string>({ label, options, value, onChange, look = 'default' }: ChoiceGroupProps<T>) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const pressed = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center rounded-pill border-2 transition-colors',
              look === 'filter' ? 'min-h-10 px-3.5 text-[13px]' : 'min-h-touch px-4 text-sm',
              pressed
                ? cn('border-ink bg-ink font-black', look === 'filter' ? 'text-white' : 'text-cream')
                : 'border-line bg-surface font-extrabold text-ink hover:border-muted',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
