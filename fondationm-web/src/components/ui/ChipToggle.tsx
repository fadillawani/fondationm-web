import { cn } from '../../lib/cn'

interface ChipToggleProps {
  label: string
  pressed: boolean
  onToggle: () => void
}

export function ChipToggle({ label, pressed, onToggle }: ChipToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={cn(
        'relative inline-flex h-10 items-center rounded-pill border-2 px-4 text-sm font-extrabold transition-colors',
        "before:absolute before:inset-x-0 before:-inset-y-0.5 before:content-['']",
        pressed ? 'border-ink bg-ink text-cream' : 'border-line bg-surface text-ink hover:border-muted',
      )}
    >
      {label}
    </button>
  )
}
