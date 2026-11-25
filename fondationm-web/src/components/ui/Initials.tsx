import { cn } from '../../lib/cn'
import { initialsOf } from '../../lib/initials'

type InitialsTone = 'school' | 'speaker' | 'user'

const TONES: Record<InitialsTone, string> = {
  school: 'bg-indigo text-cream',
  speaker: 'bg-orange text-ink',
  user: 'bg-cream text-terra-dark',
}


interface InitialsProps {
  name: string
  tone: InitialsTone
  size?: 'md' | 'lg'
  max?: number
}

export function Initials({ name, tone, size = 'md', max = 2 }: InitialsProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-pill font-display leading-none',
        size === 'lg' ? 'size-16 text-2xl' : 'size-11 text-lg',
        TONES[tone],
      )}
    >
      {initialsOf(name, max)}
    </span>
  )
}
