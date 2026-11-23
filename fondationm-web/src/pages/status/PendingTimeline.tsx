import { cn } from '../../lib/cn'

export type StepState = 'done' | 'current' | 'upcoming'

export interface TimelineStep {
  label: string
  detail?: string
  state: StepState
}

const STATE_LABELS: Record<StepState, string> = {
  done: 'Terminé',
  current: 'En cours',
  upcoming: 'À venir',
}

const MARKERS: Record<StepState, string> = {
  done: 'bg-green text-white',
  current: 'bg-orange text-ink',
  upcoming: 'border-2 border-line bg-surface text-muted',
}

function Marker({ state, index }: { state: StepState; index: number }) {
  return (
    <span
      aria-hidden="true"
      className={cn('flex size-9 shrink-0 items-center justify-center rounded-field font-display text-lg', MARKERS[state])}
    >
      {state === 'done' ? '✓' : index + 1}
    </span>
  )
}

export function PendingTimeline({ steps }: { steps: readonly TimelineStep[] }) {
  return (
    <div className="flex flex-col gap-4">
      <ol aria-label="Avancement de votre demande" className="grid gap-4 md:grid-cols-4">
        {steps.map((step, index) => (
          <li key={step.label} className="flex items-start gap-3 md:flex-col">
            <Marker state={step.state} index={index} />
            <div className="flex flex-col">
              <span className={cn('font-extrabold', step.state === 'upcoming' ? 'text-muted' : 'text-ink')}>
                {step.label}
              </span>
              <span className="sr-only">{STATE_LABELS[step.state]}</span>
              {step.detail && <span className="text-sm font-semibold text-muted">{step.detail}</span>}
            </div>
          </li>
        ))}
      </ol>
      <ul aria-hidden="true" className="flex flex-wrap gap-4 text-xs font-bold text-muted">
        {(['done', 'current', 'upcoming'] as const).map((state) => (
          <li key={state} className="flex items-center gap-2">
            <span className={cn('size-3 rounded-full', MARKERS[state])} />
            {STATE_LABELS[state]}
          </li>
        ))}
      </ul>
    </div>
  )
}
