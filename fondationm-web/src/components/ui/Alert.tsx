import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type AlertTone = 'info' | 'success' | 'warning' | 'error'

const TONES: Record<AlertTone, string> = {
  info: 'border-indigo bg-indigo-tint text-indigo',
  success: 'border-green bg-green-tint text-green',
  warning: 'border-yellow bg-cream text-ink',
  error: 'border-red bg-red-tint text-red',
}

interface AlertProps {
  tone?: AlertTone
  title?: string
  action?: ReactNode
  children: ReactNode
}

export function Alert({ tone = 'info', title, action, children }: AlertProps) {
  const urgent = tone === 'error' || tone === 'warning'
  return (
    <div
      role={urgent ? 'alert' : 'status'}
      className={cn('rounded-block border-l-[6px] px-4 py-3 text-sm font-semibold', TONES[tone])}
    >
      {title && <p className="font-black">{title}</p>}
      <div>{children}</div>
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
