import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useLocation } from 'react-router'
import { z } from 'zod'
import { errorMessage, isRetryable } from '../api/errors'
import { readLoginNotice, useLogin } from '../auth/hooks'
import { PATHS } from '../auth/roles'
import { AuthSplitLayout } from '../components/layout/AuthSplitLayout'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { FormField } from '../components/ui/FormField'
import { Input } from '../components/ui/Input'
import { PasswordInput } from '../components/ui/PasswordInput'
import { applyServerFieldErrors } from '../lib/serverFieldErrors'

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Indiquez votre adresse e-mail.')
    .pipe(z.email('Cette adresse e-mail ne semble pas valide.')),
  password: z.string().min(1, 'Indiquez votre mot de passe.'),
})

type LoginFormInput = z.input<typeof loginSchema>
type LoginFormValues = z.output<typeof loginSchema>

export function LoginPage() {
  const location = useLocation()
  const notice = readLoginNotice(location.state)
  const login = useLogin()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormInput, unknown, LoginFormValues>({ resolver: zodResolver(loginSchema) })

  const submit = (values: LoginFormValues) => {
    login.mutate(values, {
      onError: (error) => applyServerFieldErrors(error, setError, { fields: ['email', 'password'] }),
    })
  }

  const retry = () => {
    if (login.variables !== undefined) submit(login.variables)
  }

  return (
    <AuthSplitLayout
      tone="terra"
      eyebrow="Bienvenue"
      title="Chaque rencontre ouvre un métier à un jeune"
      intro="Écoles, intervenants, Fondation et donateurs : tout le programme au même endroit."
    >
      <div>
        <h1 className="text-[32px] leading-tight">Bon retour parmi nous</h1>
        <p className="mt-1 text-sm font-semibold text-muted">Connectez-vous avec votre adresse e-mail.</p>
      </div>

      <form noValidate onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
        <FormField label="E-mail" error={errors.email?.message} required>
          {(control) => (
            <Input
              {...control}
              {...register('email')}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="vous@exemple.sn"
              className="h-[50px]"
            />
          )}
        </FormField>
        <FormField label="Mot de passe" error={errors.password?.message} required>
          {(control) => (
            <PasswordInput
              {...control}
              {...register('password')}
              autoComplete="current-password"
              className="h-[50px]"
            />
          )}
        </FormField>

        {notice === 'session-expired' && login.isIdle && (
          <Alert tone="warning" title="Session expirée">
            Votre session a expiré. Merci de vous reconnecter.
          </Alert>
        )}

        {notice === 'account-created' && login.isIdle && (
          <Alert tone="success">Compte créé. Connectez-vous pour suivre votre demande.</Alert>
        )}

        {login.isError && (
          <Alert
            tone="error"
            action={
              isRetryable(login.error) && (
                <Button variant="danger" size="md" onClick={retry}>
                  Réessayer
                </Button>
              )
            }
          >
            {errorMessage(login.error)}
          </Alert>
        )}

        <Button type="submit" fullWidth loading={login.isPending} className="mt-2">
          Se connecter
        </Button>
      </form>

      <p className="text-center text-[13px] font-semibold text-muted">
        <Link to={PATHS.register} className="font-extrabold text-indigo underline underline-offset-2">
          Pas encore de compte ?
        </Link>
      </p>
    </AuthSplitLayout>
  )
}
