import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { errorMessage } from '../api/errors'
import { useChangePassword, useLogout } from '../auth/hooks'
import { CenteredLayout } from '../components/layout/CenteredLayout'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { FormField } from '../components/ui/FormField'
import { PasswordInput } from '../components/ui/PasswordInput'
import { applyServerFieldErrors } from '../lib/serverFieldErrors'
import { passwordRule } from './register/schemas'

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

export function MustChangePasswordPage() {
  const changePassword = useChangePassword()
  const logout = useLogout()
  const [formError, setFormError] = useState<unknown>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordInput, unknown, ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  const submit = ({ currentPassword, newPassword }: ChangePasswordValues) => {
    setFormError(null)
    changePassword.mutate(
      { currentPassword, newPassword },
      {
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
    <CenteredLayout>
      <Card className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-[32px] leading-tight">Choisissez votre mot de passe</h1>
          <p className="text-sm font-semibold text-muted">
            Votre mot de passe a été remis par votre établissement ou par la Fondation M. Pour protéger
            votre compte, choisissez-en un nouveau avant de continuer.
          </p>
        </div>

        <form noValidate onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          <FormField label="Mot de passe actuel" error={errors.currentPassword?.message} required>
            {(control) => (
              <PasswordInput {...control} {...register('currentPassword')} autoComplete="current-password" />
            )}
          </FormField>
          <FormField
            label="Nouveau mot de passe"
            hint="8 caractères minimum"
            error={errors.newPassword?.message}
            required
          >
            {(control) => <PasswordInput {...control} {...register('newPassword')} autoComplete="new-password" />}
          </FormField>
          <FormField label="Confirmer le nouveau mot de passe" error={errors.confirmPassword?.message} required>
            {(control) => (
              <PasswordInput {...control} {...register('confirmPassword')} autoComplete="new-password" />
            )}
          </FormField>

          {formError !== null && <Alert tone="error">{errorMessage(formError)}</Alert>}

          <div className="mt-2 flex flex-col gap-2">
            <Button type="submit" fullWidth loading={changePassword.isPending}>
              Enregistrer mon mot de passe
            </Button>
            <Button variant="secondary" fullWidth size="md" onClick={logout}>
              Se déconnecter
            </Button>
          </div>
        </form>
      </Card>
    </CenteredLayout>
  )
}
