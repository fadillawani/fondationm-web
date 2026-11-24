import { Link } from 'react-router'
import { PATHS } from '../../auth/roles'
import { cn } from '../../lib/cn'

interface AuthTabsProps {
  activeLabel: string
  /** École : indigo / crème ; intervenant : encre / crème (maquette). */
  activeTone: 'indigo' | 'ink'
}

export function AuthTabs({ activeLabel, activeTone }: AuthTabsProps) {
  return (
    <nav aria-label="Connexion ou inscription" className="grid grid-cols-2 gap-1 rounded-[14px] bg-canvas p-1 md:rounded-2xl md:p-1.5">
      <Link
        to={PATHS.login}
        className="flex min-h-touch items-center justify-center rounded-[10px] px-3 text-sm font-extrabold text-muted hover:text-ink md:rounded-[12px] md:text-[15px]"
      >
        Se connecter
      </Link>
      <span
        aria-current="page"
        className={cn(
          'flex min-h-touch items-center justify-center rounded-[10px] px-3 text-center text-sm font-black md:rounded-[12px] md:text-[15px]',
          activeTone === 'indigo' ? 'bg-indigo text-cream' : 'bg-ink text-cream',
        )}
      >
        {activeLabel}
      </span>
    </nav>
  )
}
