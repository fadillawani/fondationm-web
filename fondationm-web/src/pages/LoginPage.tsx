import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useLocation } from 'react-router'
import { z } from 'zod'
import { errorFromException, errorMessage, isRetryable } from '../api/errors'
import { useLogin, type LoginRedirectState } from '../auth/hooks'
import { Logo } from '../components/layout/Logo'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { FormField } from '../components/ui/FormField'
import { Input } from '../components/ui/Input'
import { PasswordInput } from '../components/ui/PasswordInput'

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

const FORM_FIELDS: ReadonlyArray<keyof LoginFormInput> = ['email', 'password']

function isFormField(field: string): field is keyof LoginFormInput {
  return FORM_FIELDS.some((name) => name === field)
}

function isLoginRedirectState(state: unknown): state is LoginRedirectState {
  return typeof state === 'object' && state !== null && 'sessionExpired' in state
}

export function LoginPage() {
  const location = useLocation()
  const login = useLogin()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormInput, unknown, LoginFormValues>({ resolver: zodResolver(loginSchema) })

  const submit = (values: LoginFormValues) => {
    login.mutate(values, {
      onError: (error) => {
        for (const fieldError of errorFromException(error).fieldErrors) {
          if (isFormField(fieldError.field)) {
            setError(fieldError.field, { type: 'server', message: fieldError.message })
          }
        }
      },
    })
  }

  const retry = () => {
    if (login.variables !== undefined) submit(login.variables)
  }

  return (
    <div className="min-h-dvh bg-canvas md:flex">
      <aside className="flex flex-col bg-terra px-5 pt-7 pb-[42px] md:sticky md:top-0 md:h-dvh md:w-[42%] md:min-w-[420px] md:justify-between md:p-12">
        <Logo className="text-2xl text-cream-soft md:text-[32px]" />
        <div className="mt-4 flex flex-col gap-3 md:mt-0 md:gap-5">
          <p className="hidden text-xs font-black uppercase tracking-[0.12em] text-cream-soft md:block">
            Bienvenue
          </p>
          <p className="font-display text-[32px] leading-none text-cream-soft md:text-[50px]">
            Chaque rencontre ouvre un métier à un jeune
          </p>
          <p className="text-sm font-semibold text-white md:text-[17px]">
            Écoles, intervenants, Fondation et donateurs : tout le programme au même endroit.
          </p>
        </div>
        <p className="hidden text-sm font-semibold text-white md:block">
          Une question ?{' '}
          <a
            href="mailto:contact@fondationm.sn"
            className="font-extrabold underline underline-offset-2 focus-visible:outline-cream"
          >
            contact@fondationm.sn
          </a>
        </p>
      </aside>

      <main className="flex justify-center px-4 pb-10 md:flex-1 md:items-center md:p-12">
        <Card className="relative -mt-3.5 flex w-full max-w-[460px] flex-col gap-6 md:mt-0">
          <div>
            <h1 className="text-[32px] leading-tight">Bon retour parmi nous</h1>
            <p className="mt-1 text-sm font-semibold text-muted">
              Connectez-vous avec votre adresse e-mail.
            </p>
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

            {isLoginRedirectState(location.state) && login.isIdle && (
              <Alert tone="warning" title="Session expirée">
                Votre session a expiré. Merci de vous reconnecter.
              </Alert>
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
            <span
              role="link"
              aria-disabled="true"
              title="L'inscription sera bientôt disponible"
              className="cursor-not-allowed underline decoration-dotted underline-offset-2"
            >
              Pas encore de compte ?
            </span>
          </p>
        </Card>
      </main>
    </div>
  )
}
