import type { ComponentType } from 'react'
import { NavLink, Outlet } from 'react-router'
import { useCurrentUser } from '../../auth/currentUserContext'
import { useLogout } from '../../auth/hooks'
import { ROLE_TAGLINE, accountCard, navItemsFor, type NavIcon, type NavItem } from '../../auth/roles'
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
  RequestsIcon,
} from './icons'
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

/** Lien de la barre latérale (maquette : 44 px, padding 0 14, rayon 12, 15 px). */
const SIDEBAR_ITEM =
  'flex min-h-touch items-center gap-3 rounded-[12px] px-3.5 text-[15px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2'

/** Entrée de la navigation basse (maquette : 52 px, 11 px ; Fondation 10 px). */
const BOTTOM_ITEM =
  'relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-[3px] rounded-[12px] px-0.5 text-center focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink'

function CountBadge({ count, theme, className }: { count: number | undefined; theme: string; className?: string }) {
  if (count === undefined || count === 0) return null
  return (
    <span
      className={cn('inline-flex h-6 min-w-6 items-center justify-center rounded-pill px-1.5 text-xs font-black', theme, className)}
    >
      <span aria-hidden="true">{count}</span>
      <span className="sr-only">{`${count} en attente`}</span>
    </span>
  )
}

function SidebarItem({ item, theme, count }: { item: NavItem; theme: RoleTheme; count: number | undefined }) {
  const Icon = ICONS[item.icon]
  if (item.to === undefined) {
    return (
      <li className={cn(SIDEBAR_ITEM, 'cursor-not-allowed font-extrabold', theme.link)}>
        <Icon className="size-5" />
        <span className="flex-1">{item.label}</span>
        <span className={cn('rounded-pill px-2 py-0.5 text-[11px] font-black uppercase tracking-[0.06em]', theme.soon)}>
          Bientôt
        </span>
      </li>
    )
  }
  return (
    <li>
      <NavLink
        to={item.to}
        className={({ isActive }) =>
          cn(SIDEBAR_ITEM, theme.focus, isActive ? cn('font-black', theme.active) : cn('font-extrabold', theme.link))
        }
      >
        <Icon className="size-5" />
        <span className="flex-1">{item.label}</span>{' '}
        <CountBadge count={count} theme={theme.badge} />
      </NavLink>
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
  const card = accountCard(user)
  const mobileItems = items.filter((item) => item.mobile !== false)
  const bottomText = user.role === 'FOUNDATION' ? 'text-[10px]' : 'text-[11px]'
  const tagline = ROLE_TAGLINE[user.role]

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
          'hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-sidebar lg:shrink-0 lg:flex-col lg:gap-7 lg:overflow-y-auto lg:px-5 lg:py-7',
          theme.surface,
        )}
      >
        <div className="flex flex-col gap-0.5">
          <span className={cn('font-display text-[30px] leading-none', theme.logo)}>FondationM</span>
          {tagline && (
            <span className={cn('text-xs uppercase tracking-[0.1em]', theme.tagline)}>{tagline}</span>
          )}
        </div>
        <nav aria-label="Navigation principale" className="flex-1">
          <ul className="flex flex-col gap-1">
            {items.map((item) => (
              <SidebarItem key={item.label} item={item} theme={theme} count={badgeCount(item)} />
            ))}
          </ul>
        </nav>
        <div className="flex flex-col gap-2">
          <div className={cn('flex items-center gap-3 rounded-2xl p-3.5', theme.card)}>
            <span
              aria-hidden="true"
              className={cn('inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] font-display text-lg', theme.avatar)}
            >
              {initialsOf(card.name, card.initials)}
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-black text-white">{card.name}</span>
              <span className="truncate text-xs font-bold text-canvas">{card.detail}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className={cn(
              'inline-flex min-h-touch items-center gap-2 self-start rounded-[12px] px-3.5 text-sm font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2',
              theme.link,
              theme.focus,
            )}
          >
            <LogoutIcon className="size-4" />
            Se déconnecter
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-24 lg:pb-0">
        <main id="contenu" tabIndex={-1} className="mx-auto w-full max-w-[1180px] flex-1 px-4 pb-6 pt-[18px] lg:px-8 lg:pb-10 lg:pt-7">
          <Outlet />
        </main>
      </div>

      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface px-2 pb-[max(22px,env(safe-area-inset-bottom))] pt-2 lg:hidden"
      >
        <ul className="flex">
          {mobileItems.map((item) => {
            const Icon = ICONS[item.icon]
            if (item.to === undefined) {
              return (
                <li key={item.label} className={cn(BOTTOM_ITEM, bottomText, 'cursor-not-allowed font-extrabold text-muted')}>
                  <Icon className="size-6" />
                  {item.short}
                  <span className="text-[9px] font-black uppercase">Bientôt</span>
                </li>
              )
            }
            return (
              <li key={item.label} className="flex flex-1">
                <NavLink
                  to={item.to}
                  aria-label={badgeCount(item) ? `${item.label} ${badgeCount(item)} en attente` : item.label}
                  className={({ isActive }) =>
                    cn(BOTTOM_ITEM, bottomText, isActive ? 'font-black text-terra' : 'font-extrabold text-muted')
                  }
                >
                  <span className="relative">
                    <Icon className="size-6" />
                    <CountBadge count={badgeCount(item)} theme="bg-terra text-white" className="absolute -right-4 -top-2" />
                  </span>
                  {item.short}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
