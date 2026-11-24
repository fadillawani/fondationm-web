import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Logo } from './Logo'

export type LoginTone = 'terra' | 'green' | 'yellow'

/**
 * Colonnes des connexions Fondation (W3, terracotta), donateur (W4, vert) et élève (W5, jaune).
 * Sur terracotta, la crème est `#FFF0C4` (4,60:1) au lieu de `#FDE7A6` (4,26:1, décision 10).
 */
const TONES: Record<LoginTone, { aside: string; accent: string; body: string; note: string }> = {
  terra: { aside: 'bg-terra', accent: 'text-cream-soft', body: 'text-white', note: 'font-bold text-cream-soft' },
  green: { aside: 'bg-green', accent: 'text-cream', body: 'text-white', note: 'font-bold text-cream' },
  yellow: { aside: 'bg-yellow', accent: 'text-ink', body: 'text-ink', note: 'font-extrabold text-ink' },
}

interface LoginSplitLayoutProps {
  tone: LoginTone
  eyebrow: string
  title: string
  /** Texte de la colonne PC. */
  intro: string
  /** Texte de l'en-tête mobile (W5) ; absent sur W3 et W4. */
  mobileIntro?: string
  /** Bloc sous le texte, PC seulement (W5 : pastilles des secteurs). */
  extra?: ReactNode
  /** Ligne du bas de la colonne PC, reprise sous le formulaire sur mobile. */
  note: string
  children: ReactNode
}

export function LoginSplitLayout({ tone, eyebrow, title, intro, mobileIntro, extra, note, children }: LoginSplitLayoutProps) {
  const colors = TONES[tone]
  const large = tone === 'yellow'

  return (
    <div className="min-h-dvh bg-canvas md:flex">
      <aside
        className={cn(
          'flex flex-col gap-4 rounded-b-[32px] px-6 pt-14 md:sticky md:top-0 md:h-dvh md:flex-[1_1_420px] md:overflow-y-auto md:rounded-none md:p-12',
          large ? 'pb-9 md:gap-8' : 'pb-10 md:gap-9',
          colors.aside,
        )}
      >
        <Logo className={cn('text-[28px] md:text-[32px]', colors.accent)} />
        <div className="flex max-w-[480px] flex-col gap-4">
          <p className={cn('text-xs font-black uppercase tracking-[0.12em]', colors.accent)}>{eyebrow}</p>
          <p
            className={cn(
              'font-display',
              large ? 'text-[36px] leading-[1.02] md:text-[54px] md:leading-none' : 'text-[34px] leading-[1.05] md:text-[50px] md:leading-none',
              colors.accent,
            )}
          >
            {title}
          </p>
          {mobileIntro !== undefined && (
            <p className={cn('text-[15px] leading-[1.45] font-bold md:hidden', colors.body)}>{mobileIntro}</p>
          )}
          <p
            className={cn(
              'hidden text-[17px] leading-normal md:block',
              large ? 'font-bold' : 'font-semibold',
              colors.body,
            )}
          >
            {intro}
          </p>
        </div>
        {extra !== undefined && <div className="hidden md:block">{extra}</div>}
        <p className={cn('mt-auto hidden text-[13px] md:block', colors.note)}>{note}</p>
      </aside>

      <main className="flex flex-col md:flex-[1.2_1_480px] md:items-center md:justify-center md:p-12">
        <div className="mx-4 my-6 flex flex-col gap-[18px] rounded-[24px] bg-surface px-5 py-6 md:m-0 md:w-full md:max-w-[460px] md:gap-5 md:rounded-card md:p-9">
          {children}
        </div>
        <p className="mx-6 mb-8 text-center text-[13px] font-bold text-muted md:hidden">{note}</p>
      </main>
    </div>
  )
}
