import { useId, useState, type FormEvent } from 'react'
import { cn } from '../../../lib/cn'
import type { ManagedClass } from '../classes/classData'
import { createStudentAccess, type CreatedAccess } from './establishmentData'
import { NAME_REQUIRED, studentErrorMessage } from './establishmentText'

const FIELD =
  'h-12 w-full min-w-0 rounded-[12px] border-2 border-line bg-surface px-3 text-base font-semibold text-ink placeholder:font-semibold placeholder:text-muted focus:border-terra focus:outline-none focus:ring-[3px] focus:ring-terra/30 lg:text-[15px]'

interface AddStudentFormProps {
  cls: ManagedClass
  suffix: string
  onCreated: (access: CreatedAccess) => void
  onEditClass: () => void
}

/**
 * « + Ajouter à la classe » (maquette W5-E2) : prénom et nom ; l'ajout crée le compte de l'élève (adresse générée,
 * code d'accès). PC : bloc `#F7F3EA` rayon 18 ; mobile : carte blanche avec « Ajouter un élève à la {classe} ».
 */
export function AddStudentForm({ cls, suffix, onCreated, onEditClass }: AddStudentFormProps) {
  const id = useId()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<{ message: string; full: boolean } | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const first = firstName.trim()
    const last = lastName.trim()
    if (!first || !last) {
      setError({ message: NAME_REQUIRED, full: false })
      return
    }
    if (first.length > 100 || last.length > 100) {
      setError({ message: 'Prénom et nom : 100 caractères maximum.', full: false })
      return
    }
    setPending(true)
    setError(null)
    try {
      const access = await createStudentAccess(cls.id, first, last, suffix)
      setFirstName('')
      setLastName('')
      onCreated(access)
    } catch (caught) {
      setError(studentErrorMessage(caught, cls))
    } finally {
      setPending(false)
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void submit(event)}
      aria-labelledby={`${id}-titre`}
      className="flex flex-col gap-2.5 rounded-[18px] bg-surface p-3.5 lg:bg-canvas"
    >
      <p id={`${id}-titre`} className="text-[15px] font-black text-ink lg:sr-only">
        Ajouter un élève à la {cls.title}
      </p>
      <div className="flex flex-col gap-2.5 lg:flex-row lg:flex-wrap lg:items-end">
        <div className="flex gap-2 lg:contents">
          <div className="flex min-w-0 flex-1 flex-col gap-1 lg:flex-[1_1_160px] lg:gap-1.5">
            <label htmlFor={`${id}-prenom`} className="text-xs font-extrabold text-ink lg:text-[13px]">
              Prénom
            </label>
            <input
              id={`${id}-prenom`}
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              placeholder="Ex. : Rokhaya"
              autoComplete="off"
              aria-invalid={error?.message === NAME_REQUIRED && !firstName.trim()}
              className={FIELD}
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1 lg:flex-[1_1_160px] lg:gap-1.5">
            <label htmlFor={`${id}-nom`} className="text-xs font-extrabold text-ink lg:text-[13px]">
              Nom
            </label>
            <input
              id={`${id}-nom`}
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              placeholder="Ex. : Faye"
              autoComplete="off"
              aria-invalid={error?.message === NAME_REQUIRED && !lastName.trim()}
              className={FIELD}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending || undefined}
          className={cn(
            'inline-flex min-h-12 items-center justify-center gap-2 rounded-[12px] bg-indigo px-[18px] text-[15px] font-black text-white disabled:cursor-not-allowed disabled:opacity-60 lg:text-sm',
          )}
        >
          {pending && <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />}
          + Ajouter à la classe
        </button>
      </div>
      {error !== null && (
        <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-extrabold text-red lg:text-sm">
          <span>{error.message}</span>
          {error.full && (
            <button type="button" onClick={onEditClass} className="min-h-touch font-black text-indigo underline underline-offset-2">
              Modifier la classe
            </button>
          )}
        </div>
      )}
    </form>
  )
}
