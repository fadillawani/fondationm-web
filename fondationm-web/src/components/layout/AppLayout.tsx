import { useEffect, useId, useState, type ComponentType } from 'react'
import { NavLink, Outlet } from 'react-router'
import { useCurrentUser } from '../../auth/currentUserContext'
import { useLogout } from '../../auth/hooks'
import { ROLE_LABEL, ROLE_TAGLINE, accountCard, navItemsFor, type NavIcon, type NavItem } from '../../auth/roles'
import { cn } from '../../lib/cn'
import { initialsOf } from '../../lib/initials'
import { useNavBadges } from '../../nav/badges'
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
import { ROLE_THEME, type RoleTheme } from './roleTheme'

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
  'flex min-h-touch items-center gap-3 rounded-button px-4 font-extrabold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2'

const BOTTOM_ITEM =
  'relative flex min-h-touch flex-1 flex-col items-center justify-center gap-0.5 rounded-button px-1 py-2 text-center text-xs font-extrabold focus-visible:outline-2 focus-visible:-outline-offset-2'

function CountBadge({ count, theme, className }: { count: number | undefined; theme: RoleTheme; className?: string }) {
  if (count === undefined || count === 0) return null
  return (
    <span
      className={cn('inline-flex min-w-6 items-center justify-center rounded-pill px-1.5 text-xs font-black', theme.badge, className)}
    >
      <span aria-hidden="true">{count}</span>
      <span className="sr-only">{`${count} en attente`}</span>
    </span>
  )
}

function SoonPill({ className }: { className?: string }) {
  return (
    <span className={cn('rounded-pill px-2 py-0.5 text-[11px] font-black uppercase tracking-[0.06em]', className)}>
      Bientôt
    </span>
  )
}

/** Fenêtre « Plus » de la navigation basse : entrées désactivées. */
function MoreMenu({ items, theme }: { items: NavItem[]; theme: RoleTheme }) {
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
        className={cn(BOTTOM_ITEM, theme.focus, open ? theme.active : theme.hover)}
      >
        <MoreIcon className="size-6" />
        Plus
      </button>
      <div
        id={menuId}
        hidden={!open}
        className="absolute inset-x-3 bottom-full mb-2 rounded-block border-2 border-line bg-surface p-3 text-ink shadow-raised"
      >
        <ul aria-label="Autres rubriques" className="flex flex-col gap-1">
          {items.map((item) => {
            const Icon = ICONS[item.icon]
            return (
              <li key={item.label} className="flex min-h-touch items-center gap-3 rounded-button px-3 font-extrabold text-muted">
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
  const theme = ROLE_THEME[user.role]
  const items = navItemsFor(user.role)
  const badges = useNavBadges(user.role)
  const badgeCount = (item: NavItem) => (item.badge === undefined ? undefined : badges[item.badge])
  const activeItems = items.filter((item) => item.to !== undefined)
  const disabledItems = items.filter((item) => item.to === undefined)
  // Navigation basse : 5 entrées au plus (déconnexion comprise) ; au-delà, les entrées désactivées
  // sont regroupées sous « Plus ».
  const groupDisabled = items.length + 1 > 5
  const card = accountCard(user)
  const sidebarLink = ({ isActive }: { isActive: boolean }) =>
    cn(SIDEBAR_ITEM, theme.focus, isActive ? theme.active : theme.hover)
  const bottomLink = ({ isActive }: { isActive: boolean }) =>
    cn(BOTTOM_ITEM, theme.focus, isActive ? theme.active : theme.hover)

  return (
    <div className="min-h-dvh bg-canvas lg:flex">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-field focus:bg-surface focus:px-4 focus:py-3 focus:font-bold focus:shadow-raised"
      >
        Aller au contenu
      </a>

      <aside
        className={cn(
          'hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-sidebar lg:shrink-0 lg:flex-col lg:gap-8 lg:overflow-y-auto lg:px-5 lg:py-8',
          theme.surface,
        )}
      >
        <Logo className="px-4" subtitle={ROLE_TAGLINE[user.role]} />
        <nav aria-label="Navigation principale" className="flex-1">
          <ul className="flex flex-col gap-1.5">
            {items.map((item) => {
              const Icon = ICONS[item.icon]
              if (item.to === undefined) {
                return (
                  <li key={item.label} className={cn(SIDEBAR_ITEM, 'cursor-not-allowed')}>
                    <Icon className="size-5" />
                    <span className="flex-1">{item.label}</span>
                    <SoonPill className={theme.soon} />
                  </li>
                )
              }
              return (
                <li key={item.label}>
                  <NavLink to={item.to} className={sidebarLink}>
                    <Icon className="size-5" />
                    <span className="flex-1">{item.label}</span>{' '}
                    <CountBadge count={badgeCount(item)} theme={theme} />
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>
        <div className={cn('flex flex-col gap-2 rounded-block p-3', theme.card)}>
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className={cn(
                'inline-flex size-10 shrink-0 items-center justify-center rounded-pill font-display text-lg',
                theme.avatar,
              )}
            >
              {initialsOf(card.name, card.initials)}
            </span>
            <div className="min-w-0">
              <p className={cn('truncate font-extrabold', theme.cardName)}>{card.name}</p>
              <p className={cn('truncate text-sm font-bold', theme.cardDetail)}>{card.detail || ROLE_LABEL[user.role]}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className={cn(SIDEBAR_ITEM, 'px-2 hover:bg-white/10 focus-visible:outline-cream', theme.cardName)}
          >
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
        className={cn('fixed inset-x-0 bottom-0 z-40 px-1 pb-[env(safe-area-inset-bottom)] pt-1 lg:hidden', theme.surface)}
      >
        <ul className="relative flex gap-1">
          {(groupDisabled ? activeItems : items).map((item) => {
            const Icon = ICONS[item.icon]
            if (item.to === undefined) {
              return (
                <li key={item.label} className={cn(BOTTOM_ITEM, 'cursor-not-allowed')}>
                  <Icon className="size-6" />
                  {item.label}
                  <span className="text-[10px] font-black uppercase">Bientôt</span>
                </li>
              )
            }
            return (
              <li key={item.label} className="flex flex-1">
                <NavLink to={item.to} className={bottomLink}>
                  <span className="relative">
                    <Icon className="size-6" />
                    <CountBadge count={badgeCount(item)} theme={theme} className="absolute -right-4 -top-2" />
                  </span>{' '}
                  {item.label}
                </NavLink>
              </li>
            )
          })}
          {groupDisabled && disabledItems.length > 0 && <MoreMenu items={disabledItems} theme={theme} />}
          <li className="flex flex-1">
            <button type="button" onClick={logout} className={bottomLink({ isActive: false })}>
              <LogoutIcon className="size-6" />
              Déconnexion
            </button>
          </li>
        </ul>
      </nav>
    </div>
  )
}
