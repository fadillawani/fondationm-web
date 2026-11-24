import { zodResolver } from '@hookform/resolvers/zod'
import type { KeyboardEvent } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { errorFromException, errorMessage } from '../../api/errors'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { FormField } from '../../components/ui/FormField'
import { Input } from '../../components/ui/Input'
import { useCreateClass, type SchoolClass } from './schoolData'

const schema = z.object({
  title: z.string().trim().min(1, "Indiquez l'intitulé de la classe.").max(100, '100 caractères maximum.'),
  fieldOfStudy: z.string().trim().min(1, 'Indiquez la filière.').max(100, '100 caractères maximum.'),
  studentCount: z
    .string()
    .trim()
    .regex(/^\d+$/, "Indiquez le nombre d'élèves.")
    .refine((value) => Number(value) >= 1 && Number(value) <= 500, "L'effectif doit être compris entre 1 et 500."),
})

type NewClassValues = z.infer<typeof schema>
const FIELDS = ['title', 'fieldOfStudy', 'studentCount'] as const

interface NewClassFormProps {
  onCreated: (created: SchoolClass) => void
  onCancel?: () => void
}

/**
 * Ajout minimal d'une classe (la gestion complète viendra avec « Mon établissement »).
 * Ce n'est pas un <form> : il est placé dans le formulaire de demande, et les formulaires ne s'imbriquent pas.
 */
export function NewClassForm({ onCreated, onCancel }: NewClassFormProps) {
  const create = useCreateClass()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<NewClassValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', fieldOfStudy: '', studentCount: '' },
  })

  const submit = handleSubmit((values) => {
    create.mutate(
      { title: values.title, fieldOfStudy: values.fieldOfStudy, studentCount: Number(values.studentCount) },
      {
        onSuccess: onCreated,
        onError: (error) => {
          let placed = false
          for (const fieldError of errorFromException(error).fieldErrors) {
            const name = FIELDS.find((field) => field === fieldError.field)
            if (name !== undefined) {
              setError(name, { type: 'server', message: fieldError.message }, { shouldFocus: !placed })
              placed = true
            }
          }
          if (!placed) setError('root', { type: 'server', message: errorMessage(error) })
        },
      },
    )
  })

  // Entrée ajoute la classe au lieu d'envoyer le formulaire de demande qui l'entoure.
  function submitOnEnter(event: KeyboardEvent) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    void submit()
  }

  return (
    <fieldset className="flex flex-col gap-3 rounded-block border-2 border-dashed border-line p-4">
      <legend className="px-1 text-lg text-ink">Ajouter une classe</legend>
      <FormField label="Intitulé" required error={errors.title?.message}>
        {(control) => <Input {...control} {...register('title')} onKeyDown={submitOnEnter} placeholder="Ex. : Terminale S2" maxLength={100} />}
      </FormField>
      <FormField label="Filière" required error={errors.fieldOfStudy?.message}>
        {(control) => <Input {...control} {...register('fieldOfStudy')} onKeyDown={submitOnEnter} placeholder="Ex. : Scientifique" maxLength={100} />}
      </FormField>
      <FormField label="Effectif" required error={errors.studentCount?.message}>
        {(control) => <Input {...control} {...register('studentCount')} onKeyDown={submitOnEnter} inputMode="numeric" placeholder="Ex. : 32" />}
      </FormField>
      {errors.root?.message && <Alert tone="error">{errors.root.message}</Alert>}
      <div className="flex flex-wrap gap-2">
        <Button size="md" variant="secondary" loading={create.isPending} onClick={() => void submit()}>
          Ajouter la classe
        </Button>
        {onCancel && (
          <Button size="md" variant="outline" onClick={onCancel} disabled={create.isPending}>
            Annuler
          </Button>
        )}
      </div>
    </fieldset>
  )
}
