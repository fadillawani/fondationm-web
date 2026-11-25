import { useEffect, useId, useState, type ComponentType } from 'react'
import { NavLink, Outlet } from 'react-router'
import { useCurrentUser } from '../../auth/currentUserContext'
import { useLogout } from '../../auth/hooks'
import { ROLE_LABEL, ROLE_TAGLINE, accountCardName, navItemsFor, type NavIcon, type NavItem } from '../../auth/roles'
import { cn } from '../../lib/cn'
import { usePendingTotal } from '../../pages/foundation/accounts'
import { initialsOf } from '../../lib/initials'
import {
  AccountsIcon,
  DashboardIcon,
  DonorsIcon,
  FeedbacksIcon,
  HomeIcon,
  LogoutIcon,
  MeetingsIcon,
  MoreIcon,
  RequestsIcon,
} from './icons'
import { Logo } from './Logo'

const ICONS: Record<NavIcon, ComponentType<{ className?: string }>> = {
  home: HomeIcon,
  dashboard: DashboardIcon,
  accounts: AccountsIcon,
  requests: RequestsIcon,
  meetings: MeetingsIcon,
  feedbacks: FeedbacksIcon,
  donors: DonorsIcon,
}

const SIDEBAR_ITEM =
  'flex min-h-touch items-center gap-3 rounded-button px-4 font-extrabold transition-colors focus-visible:outline-cream'

function sidebarLinkClass({ isActive }: { isActive: boolean }): string {
  return cn(SIDEBAR_ITEM, isActive ? 'bg-indigo text-cream' : 'text-white hover:bg-white/10')
}

function bottomLinkClass({ isActive }: { isActive: boolean }): string {
  return cn(
    'relative flex min-h-touch flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-center text-xs font-extrabold',
    isActive ? 'text-indigo' : 'text-muted',
  )
}

function CountBadge({ count, className }: { count: number | undefined; className?: string }) {
  if (count === undefined || count === 0) return null
  return (
    <span className={cn('inline-flex min-w-6 items-center justify-center rounded-pill bg-orange px-1.5 text-xs font-black text-ink', className)}>
      <span aria-hidden="true">{count}</span>
      <span className="sr-only">{`${count} en attente`}</span>
    </span>
  )
}

function SoonPill({ className }: { className?: string }) {
  return (
    <span className={cn('rounded-pill bg-white/15 px-2 py-0.5 text-[11px] font-black uppercase tracking-[0.06em]', className)}>
      Bientôt
    </span>
  )
}

/** Fenêtre « Plus » de la navigation basse : entrées désactivées. */
function MoreMenu({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  useEffect(() => {
    if (!open) return
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [open])

  return (
    <li className="flex flex-1">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className={bottomLinkClass({ isActive: open })}
      >
        <MoreIcon className="size-6" />
        Plus
      </button>
      <div
        id={menuId}
        hidden={!open}
        className="absolute inset-x-3 bottom-full mb-2 rounded-block border-2 border-line bg-surface p-3 shadow-raised"
      >
        <ul aria-label="Autres rubriques" className="flex flex-col gap-1">
          {items.map((item) => {
            const Icon = ICONS[item.icon]
            return (
              <li
                key={item.label}
                className="flex min-h-touch items-center gap-3 rounded-button px-3 font-extrabold text-muted"
              >
                <Icon className="size-5" />
                <span className="flex-1">{item.label}</span>
                <SoonPill className="bg-line text-muted" />
              </li>
            )
          })}
        </ul>
      </div>
    </li>
  )
}

export function AppLayout() {
  const user = useCurrentUser()
  const logout = useLogout()
  const items = navItemsFor(user.role)
  const pendingTotal = usePendingTotal(items.some((item) => item.badge === 'pendingAccounts'))
  const badgeCount = (item: NavItem) => (item.badge === 'pendingAccounts' ? pendingTotal : undefined)
  const activeItems = items.filter((item) => item.to !== undefined)
  const disabledItems = items.filter((item) => item.to === undefined)
  const cardName = accountCardName(user)

  return (
    <div className="min-h-dvh bg-canvas lg:flex">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-field focus:bg-surface focus:px-4 focus:py-3 focus:font-bold focus:shadow-raised"
      >
        Aller au contenu
      </a>

      <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-sidebar lg:shrink-0 lg:flex-col lg:gap-8 lg:overflow-y-auto lg:bg-terra-dark lg:px-5 lg:py-8">
        <Logo className="px-4 text-cream" subtitle={ROLE_TAGLINE[user.role]} />
        <nav aria-label="Navigation principale" className="flex-1">
          <ul className="flex flex-col gap-1.5">
            {items.map((item) => {
              const Icon = ICONS[item.icon]
              if (item.to === undefined) {
                return (
                  <li
                    key={item.label}
                        className={cn(SIDEBAR_ITEM, 'cursor-not-allowed text-white/60')}
                  >
                    <Icon className="size-5" />
                    <span className="flex-1">{item.label}</span>
                    <SoonPill className="text-white/80" />
                  </li>
                )
              }
              return (
                <li key={item.label}>
                  <NavLink to={item.to} className={sidebarLinkClass}>
                    <Icon className="size-5" />
                    <span className="flex-1">{item.label}</span>{' '}
                    <CountBadge count={badgeCount(item)} />
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>
        <div className="flex flex-col gap-2 border-t border-white/20 pt-5">
          <div className="flex items-center gap-3 px-2">
            <span
              aria-hidden="true"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-pill bg-cream font-display text-lg text-terra-dark"
            >
              {initialsOf(cardName, 1)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-extrabold text-white">{cardName}</p>
              <p className="truncate text-sm font-bold text-cream">{user.email || ROLE_LABEL[user.role]}</p>
            </div>
          </div>
          <button type="button" onClick={logout} className={cn(SIDEBAR_ITEM, 'text-white hover:bg-white/10')}>
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
        <main id="contenu" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-10 lg:py-10">
          <Outlet />
        </main>
      </div>

      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="relative flex">
          {activeItems.map((item) => {
            const Icon = ICONS[item.icon]
            return (
              <li key={item.label} className="flex flex-1">
                <NavLink to={item.to ?? '/'} className={bottomLinkClass}>
                  <span className="relative">
                    <Icon className="size-6" />
                    <CountBadge count={badgeCount(item)} className="absolute -right-4 -top-2" />
                  </span>{' '}
                  {item.label}
                </NavLink>
              </li>
            )
          })}
          {disabledItems.length > 0 && <MoreMenu items={disabledItems} />}
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
