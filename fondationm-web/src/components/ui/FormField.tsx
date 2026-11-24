import { useId, type ReactNode } from 'react'

export interface FieldControlProps {
  id: string
  'aria-invalid': boolean
  'aria-describedby': string | undefined
  'aria-required': boolean | undefined
}

interface FormFieldProps {
  label: string
  /** Complément du libellé en poids 600 gris (maquette : « (facultatif) »). */
  labelNote?: string
  hint?: string
  /** Couleur de l'aide : vert (mot de passe, par défaut), vert foncé, ou gris (aide descriptive). */
  hintTone?: 'green' | 'darkGreen' | 'muted'
  error?: string
  required?: boolean
  children: (control: FieldControlProps) => ReactNode
}

export function FormField({ label, labelNote, hint, hintTone = 'green', error, required, children }: FormFieldProps) {
  const id = useId()
  const hintId = `${id}-aide`
  const errorId = `${id}-erreur`
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-extrabold text-ink">
        {label}
        {labelNote && (
          <>
            {' '}
            <span className="font-semibold text-muted">{labelNote}</span>
          </>
        )}
        {required && (
          <span aria-hidden="true" className="text-red">
            {' '}
            *
          </span>
        )}
      </label>
      {children({
        id,
        'aria-invalid': Boolean(error),
        'aria-describedby': describedBy || undefined,
        'aria-required': required || undefined,
      })}
      {hint && (
        <p
          id={hintId}
          className={
            hintTone === 'muted' ? 'text-xs font-bold text-muted' : hintTone === 'darkGreen' ? 'text-xs font-bold text-[#3B5221]' : 'text-xs font-bold text-green'
          }
        >
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-bold text-red">
          {error}
        </p>
      )}
    </div>
  )
}
