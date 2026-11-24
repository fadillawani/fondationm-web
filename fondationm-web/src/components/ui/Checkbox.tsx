import { useId, type ComponentPropsWithRef, type ReactNode } from 'react'

interface CheckboxProps extends Omit<ComponentPropsWithRef<'input'>, 'type'> {
  label: ReactNode
  error?: string
}

export function Checkbox({ label, error, ...props }: CheckboxProps) {
  const id = useId()
  const errorId = `${id}-erreur`

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="flex min-h-touch cursor-pointer items-start gap-3 py-1 text-sm font-semibold text-muted">
        <input
          id={id}
          type="checkbox"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className="mt-0.5 size-5 shrink-0 cursor-pointer rounded-md accent-terra"
          {...props}
        />
        <span>{label}</span>
      </label>
      {error && (
        <p id={errorId} className="text-xs font-bold text-red">
          {error}
        </p>
      )}
    </div>
  )
}
