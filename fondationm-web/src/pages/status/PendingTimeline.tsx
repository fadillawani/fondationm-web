import { cn } from '../../lib/cn'

export type StepState = 'done' | 'current' | 'upcoming'

export interface TimelineStep {
  label: string
  detail: string
  state: StepState
}

const LEGEND: Record<StepState, string> = { done: 'Terminé', current: 'En cours', upcoming: 'À venir' }

const DETAIL_COLOR: Record<StepState, string> = {
  done: 'font-bold text-[#3B5221]',
  current: 'font-extrabold text-[#8A5F00]',
  upcoming: 'font-bold text-muted',
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4">
      <path d="m5 12 5 5 9-10" />
    </svg>
  )
}

/** Rond d'étape (maquette) : terminé vert coché, en cours crème bordé de jaune avec point terracotta, à venir blanc. */
function Marker({ state }: { state: StepState }) {
  if (state === 'done') {
    return (
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-green text-white md:size-8">
        <Check />
      </span>
    )
  }
  if (state === 'current') {
    return (
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full border-4 border-yellow bg-cream md:size-8">
        <span className="size-2 rounded-full bg-terra md:size-2.5" />
      </span>
    )
  }
  return <span className="size-7 shrink-0 rounded-full border-[3px] border-[#C9BFA8] bg-surface md:size-8" />
}

/** Frise de validation du compte (maquette W1-E1-attente / W2-E7) : horizontale sur PC, verticale sur mobile. */
export function PendingTimeline({ steps }: { steps: readonly TimelineStep[] }) {
  return (
    <div className="flex flex-col gap-4">
      <ol aria-label="Étapes de validation du compte" className="flex flex-col md:flex-row">
        {steps.map((step, index) => {
          const reached = step.state !== 'upcoming'
          const nextReached = steps[index + 1]?.state === 'done' || steps[index + 1]?.state === 'current'
          return (
            <li
              key={step.label}
              aria-current={step.state === 'current' ? 'step' : undefined}
              className="flex flex-1 gap-3 md:flex-col md:gap-2.5"
            >
              <div aria-hidden="true" className="flex flex-col items-center md:w-full md:flex-row">
                <span className={cn('hidden h-1 flex-1 md:block', index === 0 ? 'invisible' : reached ? 'bg-green' : 'bg-line')} />
                <Marker state={step.state} />
                <span
                  className={cn(
                    'w-1 flex-1 md:h-1 md:w-auto',
                    index === steps.length - 1 ? 'invisible' : nextReached ? 'bg-green' : 'bg-line',
                  )}
                />
              </div>
              <div className="flex flex-col pb-4 md:items-center md:pb-0 md:text-center">
                <span className={cn('text-[15px] font-black', step.state === 'upcoming' && 'text-muted')}>{step.label}</span>
                <span className={cn('text-[13px]', DETAIL_COLOR[step.state])}>{step.detail}</span>
              </div>
            </li>
          )
        })}
      </ol>
      <ul aria-hidden="true" className="flex flex-wrap gap-4 text-xs font-extrabold text-muted">
        {(['done', 'current', 'upcoming'] as const).map((state) => (
          <li key={state} className="flex items-center gap-1.5">
            <span
              className={cn(
                'size-3 rounded-full',
                state === 'done' && 'bg-green',
                state === 'current' && 'border-[3px] border-yellow bg-cream',
                state === 'upcoming' && 'border-2 border-[#C9BFA8]',
              )}
            />
            {LEGEND[state]}
          </li>
        ))}
      </ul>
    </div>
  )
}
