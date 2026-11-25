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
  /** 'sm' : 11 px, padding 3/9 (listes) ; 'md' : 12 px, padding 4/10 (détails) ; 'lg' : 13 px (défaut). */
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

const SIZES = { sm: 'px-[9px] py-[3px] text-[11px]', md: 'px-2.5 py-1 text-xs', lg: 'px-3 py-1 text-[13px]' }

export function Badge({ tone = 'neutral', size = 'lg', children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-pill font-black',
        SIZES[size],
        TONES[tone],
      )}
    >
      {children}
    </span>
  )
}
