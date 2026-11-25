import type { ReactNode } from 'react'
import { CONTACT_EMAIL, CONTACT_PHONE } from '../../lib/referenceData'
import { cn } from '../../lib/cn'
import { Card } from '../ui/Card'
import { Logo } from './Logo'

export type AuthTone = 'terra' | 'orange'

interface AuthSplitLayoutProps {
  tone: AuthTone
  eyebrow: string
  title: string
  intro: string
  mobileIntro?: string
  steps?: readonly string[]
  wide?: boolean
  children: ReactNode
}

const TONES: Record<AuthTone, { aside: string; accent: string; body: string; step: string; link: string }> = {
  terra: {
    aside: 'bg-terra',
    accent: 'text-cream-soft',
    body: 'text-white',
    step: 'bg-indigo text-cream',
    link: 'focus-visible:outline-cream',
  },
  orange: {
    aside: 'bg-orange',
    accent: 'text-ink',
    body: 'text-ink',
    step: 'bg-ink text-cream',
    link: '',
  },
}

export function AuthSplitLayout({
  tone,
  eyebrow,
  title,
  intro,
  mobileIntro,
  steps,
  wide = false,
  children,
}: AuthSplitLayoutProps) {
  const colors = TONES[tone]

  return (
    <div className="min-h-dvh bg-canvas md:flex">
      <aside
        className={cn(
          'flex flex-col px-5 pt-7 pb-[42px] md:sticky md:top-0 md:h-dvh md:w-[42%] md:min-w-[420px] md:justify-between md:overflow-y-auto md:p-12',
          colors.aside,
        )}
      >
        <Logo className={cn('text-2xl md:text-[32px]', colors.accent)} />
        <div className="mt-4 flex flex-col gap-3 md:mt-0 md:gap-5 md:py-8">
          <p className={cn('hidden text-xs font-black uppercase tracking-[0.12em] md:block', colors.accent)}>
            {eyebrow}
          </p>
          <p
            className={cn(
              'font-display text-[32px] leading-none',
              wide ? 'md:text-[52px]' : 'md:text-[50px]',
              colors.accent,
            )}
          >
            {title}
          </p>
          {mobileIntro === undefined ? (
            <p className={cn('text-sm font-semibold md:text-[17px]', colors.body)}>{intro}</p>
          ) : (
            <>
              <p className={cn('text-sm font-semibold md:hidden', colors.body)}>{mobileIntro}</p>
              <p className={cn('hidden text-[17px] font-semibold md:block', colors.body)}>{intro}</p>
            </>
          )}
          {steps && (
            <ol className="mt-2 hidden flex-col gap-4 md:flex">
              {steps.map((step, index) => (
                <li key={step} className={cn('flex items-center gap-4 font-extrabold', colors.body)}>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-field font-display text-lg',
                      colors.step,
                    )}
                  >
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          )}
        </div>
        <p className={cn('hidden text-[13px] font-bold md:block', colors.accent)}>
          Une question ?{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className={cn('underline underline-offset-2', colors.link)}>
            {CONTACT_EMAIL}
          </a>{' '}
          · {CONTACT_PHONE}
        </p>
      </aside>

      <main
        className={cn(
          'flex justify-center px-4 pb-10 md:flex-1 md:p-12',
          wide ? 'md:items-start' : 'md:items-center',
        )}
      >
        <Card
          className={cn(
            'relative -mt-3.5 flex w-full flex-col gap-6 rounded-[24px] md:mt-0 md:rounded-card',
            wide ? 'max-w-[640px]' : 'max-w-[460px]',
          )}
        >
          {children}
        </Card>
      </main>
    </div>
  )
}
