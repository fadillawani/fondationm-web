import { zodResolver } from '@hookform/resolvers/zod'
import type { KeyboardEvent } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { errorFromException } from '../../../api/errors'
import { Alert } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { FormField } from '../../../components/ui/FormField'
import { Input } from '../../../components/ui/Input'
import { useCreateClass } from '../schoolData'
import { classErrorMessage, useUpdateClass, type ClassChanges, type ManagedClass } from './classData'

const schema = z.object({
  title: z.string().trim().min(1, "Indiquez l'intitulé de la classe.").max(100, '100 caractères maximum.'),
  fieldOfStudy: z.string().trim().min(1, 'Indiquez la filière.').max(100, '100 caractères maximum.'),
  studentCount: z
    .string()
    .trim()
    .regex(/^\d+$/, "Indiquez le nombre d'élèves.")
    .refine((value) => Number(value) >= 1 && Number(value) <= 500, "L'effectif doit être compris entre 1 et 500."),
})

type ClassValues = z.infer<typeof schema>
const FIELDS = ['title', 'fieldOfStudy', 'studentCount'] as const

interface ClassFormProps {
  /** Classe à modifier ; absente : création. */
  editing?: ManagedClass
  /** Identifiant de la classe créée ou modifiée. */
  onSaved: (id: string) => void
  onCancel?: () => void
}

/**
 * Création ou modification d'une classe, partagée par « Demander une rencontre » (F4) et « Mon établissement » (F6).
 * Ce n'est pas un <form> : il peut être placé dans le formulaire de demande, et les formulaires ne s'imbriquent pas.
 */
export function ClassForm({ editing, onSaved, onCancel }: ClassFormProps) {
  const create = useCreateClass()
  const update = useUpdateClass()
  const pending = create.isPending || update.isPending
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ClassValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: editing?.title ?? '',
      fieldOfStudy: editing?.fieldOfStudy ?? '',
      studentCount: editing?.studentCount === null || editing === undefined ? '' : String(editing.studentCount),
    },
  })

  function showError(error: unknown) {
    let placed = false
    for (const fieldError of errorFromException(error).fieldErrors) {
      const name = FIELDS.find((field) => field === fieldError.field)
      if (name !== undefined) {
        setError(name, { type: 'server', message: fieldError.message }, { shouldFocus: !placed })
        placed = true
      }
    }
    if (!placed) setError('root', { type: 'server', message: classErrorMessage(error, editing ?? null) })
  }

  const submit = handleSubmit((values) => {
    const body = { title: values.title, fieldOfStudy: values.fieldOfStudy, studentCount: Number(values.studentCount) }
    if (editing === undefined) {
      create.mutate(body, { onSuccess: (created) => onSaved(created.id), onError: showError })
      return
    }
    // Seuls les champs modifiés sont envoyés (PATCH).
    const changes: ClassChanges = {}
    if (body.title !== editing.title) changes.title = body.title
    if (body.fieldOfStudy !== editing.fieldOfStudy) changes.fieldOfStudy = body.fieldOfStudy
    if (body.studentCount !== editing.studentCount) changes.studentCount = body.studentCount
    if (Object.keys(changes).length === 0) {
      onSaved(editing.id)
      return
    }
    update.mutate({ id: editing.id, changes }, { onSuccess: (updated) => onSaved(updated.id), onError: showError })
  })

  // Entrée enregistre la classe au lieu d'envoyer le formulaire qui l'entoure.
  function submitOnEnter(event: KeyboardEvent) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    void submit()
  }

  return (
    <fieldset className="flex flex-col gap-3 rounded-block border-2 border-dashed border-line p-4">
      <legend className="px-1 text-lg text-ink">{editing ? `Modifier la classe ${editing.title}` : 'Ajouter une classe'}</legend>
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
        <Button size="md" variant="secondary" loading={pending} onClick={() => void submit()}>
          {editing ? 'Enregistrer' : 'Ajouter la classe'}
        </Button>
        {onCancel && (
          <Button size="md" variant="outline" onClick={onCancel} disabled={pending}>
            Annuler
          </Button>
        )}
      </div>
    </fieldset>
  )
}
