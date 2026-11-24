import { cn } from '../../lib/cn'

interface ChoiceGroupProps<T extends string> {
  label: string
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}

/** Choix unique en pastilles (boutons à bascule). */
export function ChoiceGroup<T extends string>({ label, options, value, onChange }: ChoiceGroupProps<T>) {
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
              'inline-flex min-h-touch items-center rounded-pill border-2 px-4 text-sm font-extrabold transition-colors',
              pressed ? 'border-ink bg-ink text-cream' : 'border-line bg-surface text-ink hover:border-muted',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
