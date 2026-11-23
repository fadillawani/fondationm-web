import type { ReactNode } from 'react'
import { useCurrentUser } from '../../auth/currentUserContext'
import { useLogout } from '../../auth/hooks'
import { Logo } from './Logo'

export function AccountStatusLayout({ children }: { children: ReactNode }) {
  const user = useCurrentUser()
  const logout = useLogout()

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="flex items-center justify-between gap-4 bg-surface px-4 py-3 shadow-card md:px-10">
        <Logo className="text-terra" />
        <div className="flex min-w-0 items-center gap-2">
          <span className="hidden truncate text-sm font-bold text-ink sm:inline">{user.displayName}</span>
          <button
            type="button"
            onClick={logout}
            className="min-h-touch shrink-0 rounded-field px-3 text-sm font-extrabold text-indigo underline underline-offset-2 hover:bg-indigo-tint"
          >
            Se déconnecter
          </button>
        </div>
      </header>
      <main className="flex flex-1 justify-center px-4 py-6 md:px-10 md:py-12">
        <section className="flex w-full max-w-[880px] flex-col gap-6 rounded-card bg-surface p-5 shadow-card md:p-10">
          {children}
        </section>
      </main>
    </div>
  )
}
