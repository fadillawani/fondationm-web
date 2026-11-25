import { Link } from 'react-router'
import { PATHS } from '../../auth/roles'
import { cn } from '../../lib/cn'

interface AuthTabsProps {
  activeLabel: string
  activeTone: 'terra' | 'ink'
}

export function AuthTabs({ activeLabel, activeTone }: AuthTabsProps) {
  return (
    <nav aria-label="Connexion ou inscription" className="grid grid-cols-2 gap-1 rounded-button bg-canvas p-1">
      <Link
        to={PATHS.login}
        className="flex min-h-touch items-center justify-center rounded-field px-3 text-sm font-extrabold text-muted hover:text-ink"
      >
        Se connecter
      </Link>
      <span
        aria-current="page"
        className={cn(
          'flex min-h-touch items-center justify-center rounded-field px-3 text-center text-sm font-extrabold',
          activeTone === 'terra' ? 'bg-terra text-white' : 'bg-ink text-cream',
        )}
      >
        {activeLabel}
      </span>
    </nav>
  )
}
