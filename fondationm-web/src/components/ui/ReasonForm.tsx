import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from './Button'
import { FormField } from './FormField'
import { Textarea } from './Textarea'

export interface ReasonValues {
  reason: string
}

interface ReasonFormProps {
  formLabel: string
  fieldLabel: string
  /** Complément du libellé en poids 600 gris (maquette). */
  fieldNote?: string
  placeholder?: string
  maxLength: number
  requiredMessage: string
  submitLabel: string
  submitting: boolean
  /** `setServerError` place un message du serveur sous le champ. */
  onSubmit: (values: ReasonValues, setServerError: (message: string) => void) => void
  onCancel: () => void
}

/** Formulaire de motif obligatoire (1 à maxLength caractères après retrait des espaces). */
export function ReasonForm({
  formLabel,
  fieldLabel,
  fieldNote,
  placeholder,
  maxLength,
  requiredMessage,
  submitLabel,
  submitting,
  onSubmit,
  onCancel,
}: ReasonFormProps) {
  const schema = useMemo(
    () =>
      z.object({
        reason: z
          .string()
          .trim()
          .min(1, requiredMessage)
          .max(maxLength, `Le motif ne doit pas dépasser ${maxLength} caractères.`),
      }),
    [maxLength, requiredMessage],
  )
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ReasonValues>({ resolver: zodResolver(schema), defaultValues: { reason: '' } })

  return (
    <form
      noValidate
      aria-label={formLabel}
      className="flex flex-col gap-3 rounded-[14px] bg-canvas p-3 lg:p-3.5"
      onSubmit={handleSubmit((values) =>
        onSubmit(values, (message) => setError('reason', { type: 'server', message }, { shouldFocus: true })),
      )}
    >
      <FormField label={fieldLabel} labelNote={fieldNote} required error={errors.reason?.message}>
        {(control) => (
          <Textarea
            {...control}
            {...register('reason')}
            // oxlint-disable-next-line jsx-a11y/no-autofocus -- le champ s'ouvre à la demande de l'utilisateur
            autoFocus
            maxLength={maxLength}
            placeholder={placeholder}
          />
        )}
      </FormField>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="danger" size="md" loading={submitting} className="min-h-12 rounded-[14px] px-[18px] text-[15px] font-black">
          {submitLabel}
        </Button>
        <Button variant="outline" size="md" onClick={onCancel} disabled={submitting} className="min-h-12 rounded-[14px] px-[18px] text-[15px]">
          Annuler
        </Button>
      </div>
    </form>
  )
}
