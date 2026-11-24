import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { UserMenu } from './UserMenu'

interface PageTitleProps {
  title: string
  /** Surtitre PC (12 px, poids 900, majuscules, terracotta). */
  kicker?: string
  /** Sur-ligne mobile (12 px, poids 800, gris) ; par défaut, le surtitre PC. */
  mobileKicker?: string
  /** Sous-titre (PC seulement, comme la maquette). */
  subtitle?: string
  /** Actions à droite du titre sur PC. */
  actions?: ReactNode
  /** Action placée avant l'avatar dans l'en-tête mobile. */
  mobileAction?: ReactNode
  className?: string
}

/**
 * En-tête de page (maquette) : sur PC surtitre, h1 Lilita 40, sous-titre et actions ;
 * sur mobile sur-ligne grise, h1 Lilita 30 et avatar ouvrant le menu du compte (pas d'en-tête commun).
 */
export function PageTitle({ title, kicker, mobileKicker, subtitle, actions, mobileAction, className }: PageTitleProps) {
  const pcKicker = 'lg:text-xs lg:font-black lg:uppercase lg:tracking-[0.12em] lg:text-terra'
  return (
    <header className={cn('flex items-start justify-between gap-3 lg:flex-wrap lg:items-end lg:gap-4', className)}>
      <div className="flex min-w-0 flex-col gap-1">
        {mobileKicker === undefined || mobileKicker === kicker ? (
          kicker && <p className={cn('text-xs font-extrabold text-muted', pcKicker)}>{kicker}</p>
        ) : (
          <>
            {kicker && <p className={cn('hidden', pcKicker, 'lg:block')}>{kicker}</p>}
            <p className="text-xs font-extrabold text-muted lg:hidden">{mobileKicker}</p>
          </>
        )}
        <h1 className="text-[30px] leading-[1.05] text-ink lg:text-[40px] lg:leading-none">{title}</h1>
        {subtitle && <p className="hidden text-[15px] font-bold text-muted lg:block">{subtitle}</p>}
      </div>
      {actions && <div className="hidden flex-wrap gap-2 lg:flex">{actions}</div>}
      <div className="flex shrink-0 items-center gap-2 lg:hidden">
        {mobileAction}
        <UserMenu />
      </div>
    </header>
  )
}
