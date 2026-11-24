import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '../../components/ui/Button'
import { FormField } from '../../components/ui/FormField'
import { Textarea } from '../../components/ui/Textarea'

export const REASON_MAX_LENGTH = 1000

const schema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'Indiquez le motif du refus : il est transmis à la personne.')
    .max(REASON_MAX_LENGTH, `Le motif ne doit pas dépasser ${REASON_MAX_LENGTH} caractères.`),
})

export type RejectValues = z.infer<typeof schema>

interface RejectFormProps {
  submitting: boolean
  onSubmit: (values: RejectValues, setServerError: (message: string) => void) => void
  onCancel: () => void
}

export function RejectForm({ submitting, onSubmit, onCancel }: RejectFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RejectValues>({ resolver: zodResolver(schema), defaultValues: { reason: '' } })

  return (
    <form
      noValidate
      aria-label="Refuser le compte"
      className="flex flex-col gap-3"
      onSubmit={handleSubmit((values) =>
        onSubmit(values, (message) => setError('reason', { type: 'server', message }, { shouldFocus: true })),
      )}
    >
      <FormField label="Motif du refus (transmis à la personne)" required error={errors.reason?.message}>
        {(control) => (
          <Textarea
            {...control}
            {...register('reason')}
            // oxlint-disable-next-line jsx-a11y/no-autofocus -- le champ s'ouvre à la demande de l'utilisateur
            autoFocus
            maxLength={REASON_MAX_LENGTH}
            placeholder="Ex. : nous n'avons pas pu vérifier l'établissement. Pouvez-vous nous envoyer un justificatif ?"
          />
        )}
      </FormField>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="danger" size="md" loading={submitting}>
          Confirmer le refus
        </Button>
        <Button variant="outline" size="md" onClick={onCancel} disabled={submitting}>
          Annuler
        </Button>
      </div>
    </form>
  )
}
