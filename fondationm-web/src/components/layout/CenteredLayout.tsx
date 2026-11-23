import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Logo } from './Logo'

export function CenteredLayout({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-canvas px-4 py-10">
      <Logo className="text-[32px] text-terra" />
      <div className={cn('w-full', wide ? 'max-w-[880px]' : 'max-w-[460px]')}>{children}</div>
    </main>
  )
}
