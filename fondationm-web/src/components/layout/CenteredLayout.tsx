import type { ReactNode } from 'react'
import { Logo } from './Logo'

export function CenteredLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-canvas px-4 py-10">
      <Logo className="text-[32px] text-terra" />
      <div className="w-full max-w-[460px]">{children}</div>
    </main>
  )
}
