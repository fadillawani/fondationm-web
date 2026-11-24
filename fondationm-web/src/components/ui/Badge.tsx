import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type BadgeTone = 'neutral' | 'primary' | 'orange' | 'success' | 'warning' | 'danger' | 'muted'

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-indigo text-cream',
  primary: 'bg-terra text-white',
  orange: 'bg-orange text-ink',
  success: 'bg-green text-white',
  warning: 'bg-yellow text-ink',
  danger: 'bg-red text-white',
  muted: 'bg-line text-ink',
}

interface BadgeProps {
  tone?: BadgeTone
  children: ReactNode
}

export function Badge({ tone = 'neutral', children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill px-3 py-1 text-[13px] font-black',
        TONES[tone],
      )}
    >
      {children}
    </span>
  )
}
