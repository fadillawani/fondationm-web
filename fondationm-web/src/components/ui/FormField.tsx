import { useId, type ReactNode } from 'react'

export interface FieldControlProps {
  id: string
  'aria-invalid': boolean
  'aria-describedby': string | undefined
  'aria-required': boolean | undefined
}

interface FormFieldProps {
  label: string
  hint?: string
  error?: string
  required?: boolean
  children: (control: FieldControlProps) => ReactNode
}

export function FormField({ label, hint, error, required, children }: FormFieldProps) {
  const id = useId()
  const hintId = `${id}-aide`
  const errorId = `${id}-erreur`
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-extrabold text-ink">
        {label}
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
        <p id={hintId} className="text-xs font-bold text-green">
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
