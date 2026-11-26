import { zodResolver } from '@hookform/resolvers/zod'
import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { errorMessage } from '../../api/errors'
import { useChangePassword } from '../../auth/hooks'
import { applyServerFieldErrors } from '../../lib/serverFieldErrors'
import { passwordRule } from '../../pages/register/schemas'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { FormField } from '../ui/FormField'
import { PasswordInput } from '../ui/PasswordInput'

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Indiquez votre mot de passe actuel.'),
    newPassword: passwordRule,
    confirmPassword: z.string().min(1, 'Confirmez votre nouveau mot de passe.'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Les deux mots de passe ne sont pas identiques.',
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    path: ['newPassword'],
    message: 'Choisissez un mot de passe différent de l’actuel.',
  })

type ChangePasswordInput = z.input<typeof changePasswordSchema>
type ChangePasswordValues = z.output<typeof changePasswordSchema>

interface PasswordChangeFormProps {
  submitLabel: string
  /** false : reste sur la page après le changement (profil) ; true : accueil du rôle (page obligatoire, F1). */
  redirect?: boolean
  /** Message annoncé après le changement (profil). */
  successMessage?: string
  /** Boutons ajoutés sous l'envoi (« Se déconnecter » de la page obligatoire). */
  extraActions?: ReactNode
  fullWidth?: boolean
}

/**
 * Formulaire de changement de mot de passe, commun à `/mot-de-passe-obligatoire` (F1) et aux profils (F13, décision 128) :
 * mêmes règles, mêmes messages, erreurs du serveur sous les champs.
 */
export function PasswordChangeForm({ submitLabel, redirect = true, successMessage, extraActions, fullWidth = true }: PasswordChangeFormProps) {
  const changePassword = useChangePassword({ redirect })
  const [formError, setFormError] = useState<unknown>(null)
  const [done, setDone] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordInput, unknown, ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  const submit = ({ currentPassword, newPassword }: ChangePasswordValues) => {
    setFormError(null)
    setDone(false)
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          if (!redirect) {
            reset()
            setDone(true)
          }
        },
        onError: (error) => {
          const attached = applyServerFieldErrors(error, setError, {
            fields: ['currentPassword', 'newPassword'],
          })
          if (!attached) setFormError(error)
        },
      },
    )
  }

  return (
    <form noValidate onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
      <FormField label="Mot de passe actuel" error={errors.currentPassword?.message} required>
        {(control) => <PasswordInput {...control} {...register('currentPassword')} autoComplete="current-password" />}
      </FormField>
      <FormField label="Nouveau mot de passe" hint="8 caractères minimum" error={errors.newPassword?.message} required>
        {(control) => <PasswordInput {...control} {...register('newPassword')} autoComplete="new-password" />}
      </FormField>
      <FormField label="Confirmer le nouveau mot de passe" error={errors.confirmPassword?.message} required>
        {(control) => <PasswordInput {...control} {...register('confirmPassword')} autoComplete="new-password" />}
      </FormField>

      {formError !== null && <Alert tone="error">{errorMessage(formError)}</Alert>}
      {successMessage !== undefined && (
        <div aria-live="polite" className="empty:hidden">
          {done && <p className="rounded-block border-l-[6px] border-green bg-green-tint px-4 py-3 text-sm font-semibold text-green">{successMessage}</p>}
        </div>
      )}

      <div className="mt-2 flex flex-col gap-2">
        <Button type="submit" fullWidth={fullWidth} size={fullWidth ? 'lg' : 'md'} loading={changePassword.isPending} className={fullWidth ? undefined : 'self-start'}>
          {submitLabel}
        </Button>
        {extraActions}
      </div>
    </form>
  )
}
