import { NavLink, Outlet } from 'react-router'
import { useCurrentUser } from '../../auth/currentUserContext'
import { useLogout } from '../../auth/hooks'
import { ROLE_LABEL, navItemsFor } from '../../auth/roles'
import { cn } from '../../lib/cn'
import { HomeIcon, LogoutIcon } from './icons'
import { Logo } from './Logo'

const SIDEBAR_ITEM =
  'flex min-h-touch items-center gap-3 rounded-button px-4 font-extrabold transition-colors focus-visible:outline-cream'

function sidebarLinkClass({ isActive }: { isActive: boolean }): string {
  return cn(SIDEBAR_ITEM, isActive ? 'bg-indigo text-cream' : 'text-white hover:bg-white/10')
}

function bottomLinkClass({ isActive }: { isActive: boolean }): string {
  return cn(
    'flex min-h-touch flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-extrabold',
    isActive ? 'text-indigo' : 'text-muted',
  )
}

export function AppLayout() {
  const user = useCurrentUser()
  const logout = useLogout()
  const items = navItemsFor(user.role)

  return (
    <div className="min-h-dvh bg-canvas lg:flex">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-field focus:bg-surface focus:px-4 focus:py-3 focus:font-bold focus:shadow-raised"
      >
        Aller au contenu
      </a>

      <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-sidebar lg:shrink-0 lg:flex-col lg:gap-10 lg:bg-terra-dark lg:px-5 lg:py-8">
        <Logo className="px-4 text-[28px] text-cream" />
        <nav aria-label="Navigation principale" className="flex-1">
          <ul className="flex flex-col gap-1.5">
            {items.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} className={sidebarLinkClass}>
                  <HomeIcon className="size-5" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex flex-col gap-1 border-t border-white/20 pt-5">
          <p className="px-4 font-extrabold text-white">{user.displayName}</p>
          <p className="px-4 text-sm font-bold text-cream">{ROLE_LABEL[user.role]}</p>
          <button type="button" onClick={logout} className={cn(SIDEBAR_ITEM, 'mt-2 text-white hover:bg-white/10')}>
            <LogoutIcon className="size-5" />
            Se déconnecter
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-20 lg:pb-0">
        <header className="flex items-center justify-between bg-surface px-4 py-3 shadow-card lg:hidden">
          <Logo className="text-terra" />
          <span className="text-sm font-bold text-muted">{ROLE_LABEL[user.role]}</span>
        </header>
        <main id="contenu" tabIndex={-1} className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 lg:px-10 lg:py-10">
          <Outlet />
        </main>
      </div>

      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="flex">
          {items.map((item) => (
            <li key={item.to} className="flex flex-1">
              <NavLink to={item.to} className={bottomLinkClass}>
                <HomeIcon className="size-6" />
                {item.label}
              </NavLink>
            </li>
          ))}
          <li className="flex flex-1">
            <button type="button" onClick={logout} className={bottomLinkClass({ isActive: false })}>
              <LogoutIcon className="size-6" />
              Déconnexion
            </button>
          </li>
        </ul>
      </nav>
    </div>
  )
}
