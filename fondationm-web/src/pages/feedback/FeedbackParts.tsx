import { useId } from 'react'
import { cn } from '../../lib/cn'
import { FEEDBACK_STEPS, RATING_LABELS, STEP_LOOK, type FeedbackStep } from './feedbackText'

/** Pastille d'état d'un retour. */
export function StepBadge({ step, className }: { step: FeedbackStep; className?: string }) {
  return <span className={cn('shrink-0 rounded-pill px-2.5 py-1 text-xs font-black', STEP_LOOK[step], className)}>{step}</span>
}

/** Étapes « À rédiger / Soumis / Validé » (maquettes W1-E6, W2-E10). */
export function FeedbackStepper({ step }: { step: FeedbackStep }) {
  const current = FEEDBACK_STEPS.indexOf(step)
  return (
    <ol aria-label="Étapes du retour" className="flex flex-wrap items-center gap-2">
      {FEEDBACK_STEPS.map((label, index) => (
        <li
          key={label}
          aria-current={index === current ? 'step' : undefined}
          className={cn(
            'inline-flex min-h-9 items-center gap-2 rounded-pill border-2 px-3 text-[13px] font-black',
            index === current ? 'border-ink bg-ink text-cream' : index < current ? 'border-green bg-surface text-green' : 'border-line bg-surface text-muted',
          )}
        >
          <span aria-hidden="true">{index < current ? '✓' : index + 1}</span>
          {label}
        </li>
      ))}
    </ol>
  )
}

export type ChipTone = 'terra' | 'indigo'

const PRESSED: Record<ChipTone, string> = {
  // Blanc sur terracotta 5,22:1 ; crème sur indigo 9,24:1.
  terra: 'border-terra bg-terra text-white',
  indigo: 'border-indigo bg-indigo text-cream',
}

interface ChipGroupProps {
  label: string
  hint?: string
  options: readonly string[]
  value: readonly string[]
  onChange: (value: string[]) => void
  tone: ChipTone
}

/** Choix multiple en pastilles (`aria-pressed`) ; une valeur relue hors liste reste affichée et décochable. */
export function ChipGroup({ label, hint, options, value, onChange, tone }: ChipGroupProps) {
  const id = useId()
  const all = [...options, ...value.filter((item) => !options.includes(item))]
  return (
    <div role="group" aria-labelledby={`${id}-titre`} aria-describedby={hint ? `${id}-aide` : undefined} className="flex flex-col gap-2">
      <p id={`${id}-titre`} className="text-[15px] font-black text-ink">
        {label}
      </p>
      {hint && (
        <p id={`${id}-aide`} className="-mt-1 text-[13px] font-bold text-muted">
          {hint}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {all.map((option) => {
          const pressed = value.includes(option)
          return (
            <button
              key={option}
              type="button"
              aria-pressed={pressed}
              onClick={() => onChange(pressed ? value.filter((item) => item !== option) : [...value, option])}
              className={cn(
                'inline-flex min-h-touch items-center rounded-pill border-2 px-4 text-sm font-extrabold transition-colors',
                pressed ? PRESSED[tone] : 'border-line bg-surface text-ink hover:border-muted',
              )}
            >
              {option}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface RatingPickerProps {
  value: number | null
  onChange: (value: number) => void
  error?: string
}

/** « Dans l'ensemble, cette rencontre… » : boutons radio natifs (flèches du clavier), libellés de la maquette. */
export function RatingPicker({ value, onChange, error }: RatingPickerProps) {
  const id = useId()
  return (
    <fieldset aria-describedby={error ? `${id}-erreur` : undefined} aria-invalid={error ? true : undefined} className="flex flex-col gap-2">
      <legend className="mb-2 text-[15px] font-black text-ink">Dans l'ensemble, cette rencontre…</legend>
      <div className="flex flex-wrap gap-2">
        {RATING_LABELS.map((label, index) => {
          const rating = index + 1
          const checked = value === rating
          return (
            <label
              key={label}
              className={cn(
                'inline-flex min-h-touch cursor-pointer items-center rounded-pill border-2 px-4 text-sm font-extrabold has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-indigo',
                checked ? 'border-ink bg-ink text-cream' : 'border-line bg-surface text-ink hover:border-muted',
              )}
            >
              <input type="radio" name={`${id}-note`} value={rating} checked={checked} onChange={() => onChange(rating)} className="sr-only" />
              {label}
            </label>
          )
        })}
      </div>
      {error && (
        <p id={`${id}-erreur`} className="text-xs font-bold text-red">
          {error}
        </p>
      )}
    </fieldset>
  )
}
