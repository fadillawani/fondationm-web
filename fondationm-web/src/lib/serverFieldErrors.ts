import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { errorFromException, errorMessage } from '../api/errors'

interface Options<T extends FieldValues> {
  fields: readonly Path<T>[]
  emailField?: Path<T>
}

/**
 * Place les erreurs du serveur sous les champs du formulaire.
 * Renvoie true si au moins une erreur a été placée sous un champ.
 */
export function applyServerFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  { fields, emailField }: Options<T>,
): boolean {
  const apiError = errorFromException(error)
  const isField = (name: string): name is Path<T> => fields.some((field) => field === name)
  let attached = false

  for (const fieldError of apiError.fieldErrors) {
    const name = fieldError.field.split(/[.[]/)[0] ?? fieldError.field
    if (isField(name)) {
      setError(name, { type: 'server', message: fieldError.message }, { shouldFocus: !attached })
      attached = true
    }
  }

  const emailConflict = apiError.status === 409 || apiError.code.includes('EMAIL')
  if (!attached && emailField !== undefined && emailConflict) {
    setError(emailField, { type: 'server', message: errorMessage(apiError) }, { shouldFocus: true })
    attached = true
  }

  return attached
}
