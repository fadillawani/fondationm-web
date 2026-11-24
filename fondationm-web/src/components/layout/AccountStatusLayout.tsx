import type { ReactNode } from 'react'
import { useCurrentUser } from '../../auth/currentUserContext'
import { useLogout } from '../../auth/hooks'

/**
 * Pages de statut du compte (maquette W1-E1-attente, W2-E7) : en-tête blanc (logo terracotta Lilita 28,
 * « {qui} » 14 px poids 700, « Se déconnecter » 14 px poids 800), contenu centré.
 */
export function AccountStatusLayout({ who, children }: { who?: string; children: ReactNode }) {
  const user = useCurrentUser()
  const logout = useLogout()

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="flex items-center justify-between gap-4 bg-surface px-4 py-4 md:px-10 md:py-5">
        <span className="font-display text-2xl leading-none text-terra md:text-[28px]">FondationM</span>
        <div className="flex min-w-0 items-center gap-4">
          <span className="hidden truncate text-sm font-bold text-muted sm:inline">{who ?? user.displayName}</span>
          <button
            type="button"
            onClick={logout}
            className="min-h-touch shrink-0 rounded-field px-1 text-sm font-extrabold text-indigo underline underline-offset-2"
          >
            Se déconnecter
          </button>
        </div>
      </header>
      <main className="flex flex-1 justify-center px-4 py-6 md:px-6 md:py-14">
        <div className="flex w-full max-w-[960px] flex-col gap-5">{children}</div>
      </main>
    </div>
  )
}
