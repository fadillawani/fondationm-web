import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation } from 'react-router'
import { z } from 'zod'
import { errorMessage, isRetryable } from '../../api/errors'
import { readLoginNotice, useLogin, type LoginCredentials } from '../../auth/hooks'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { FormField } from '../../components/ui/FormField'
import { Input } from '../../components/ui/Input'
import { PasswordInput } from '../../components/ui/PasswordInput'
import { applyServerFieldErrors } from '../../lib/serverFieldErrors'
import { toStudentLoginEmail } from '../../lib/studentLogin'

const emailSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Indiquez votre adresse e-mail.')
    .pipe(z.email('Cette adresse e-mail ne semble pas valide.')),
  password: z.string().min(1, 'Indiquez votre mot de passe.'),
})

/** Élève : « Identifiant » sans format imposé, complété par le domaine des élèves à l'envoi (lib/studentLogin). */
const studentSchema = z.object({
  email: z.string().trim().min(1, 'Indique ton identifiant.'),
  password: z.string().min(1, 'Indique ton code d’accès ou ton mot de passe.'),
})

interface LoginFormValues {
  email: string
  password: string
}

const RESOLVERS = {
  email: zodResolver(emailSchema),
  student: zodResolver(studentSchema),
} as const

interface LoginFormProps {
  /** 'student' : identifiant au lieu de l'e-mail, textes de la maquette W5. */
  mode?: 'email' | 'student'
  title: string
  subtitle: string
  submitLabel?: string
  /** Bouton : terracotta (école, intervenant, Fondation), vert (donateur), encre / crème (élève). */
  variant?: 'primary' | 'success' | 'ink'
  /** Phrase sous le bouton (13 px, gris). */
  footer?: ReactNode
}

/**
 * Formulaire commun aux pages de connexion : `POST /api/auth/login` puis `/api/me` ; la redirection suit
 * le rôle réel du compte, quelle que soit la page utilisée.
 */
export function LoginForm({ mode = 'email', title, subtitle, submitLabel = 'Se connecter', variant = 'primary', footer }: LoginFormProps) {
  const location = useLocation()
  const notice = readLoginNotice(location.state)
  const login = useLogin()
  const student = mode === 'student'
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: RESOLVERS[mode] })

  const send = (credentials: LoginCredentials) => {
    login.mutate(credentials, {
      onError: (error) => applyServerFieldErrors(error, setError, { fields: ['email', 'password'] }),
    })
  }

  const submit = (values: LoginFormValues) => {
    send(student ? { email: toStudentLoginEmail(values.email), password: values.password } : values)
  }

  const retry = () => {
    if (login.variables !== undefined) send(login.variables)
  }

  return (
    <>
      <div className="flex flex-col gap-1 md:gap-1.5">
        <h1 className="text-[26px] leading-tight md:text-[32px]">{title}</h1>
        <p className="text-sm font-semibold text-muted">{subtitle}</p>
      </div>

      <form noValidate onSubmit={handleSubmit(submit)} className="flex flex-col gap-[18px] md:gap-5">
        {student ? (
          <FormField label="Identifiant" error={errors.email?.message} required>
            {(control) => (
              <Input
                {...control}
                {...register('email')}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                className="h-[50px] text-base md:text-[15px]"
              />
            )}
          </FormField>
        ) : (
          <FormField label="E-mail" error={errors.email?.message} required>
            {(control) => (
              <Input
                {...control}
                {...register('email')}
                type="email"
                inputMode="email"
                autoComplete="username"
                placeholder="vous@exemple.sn"
                className="h-[50px] text-base md:text-[15px]"
              />
            )}
          </FormField>
        )}
        <FormField
          label={student ? 'Code d’accès ou mot de passe' : 'Mot de passe'}
          hint={student ? 'Première connexion ? Tu choisiras ton mot de passe juste après.' : undefined}
          hintTone="muted"
          error={errors.password?.message}
          required
        >
          {(control) => (
            <PasswordInput
              {...control}
              {...register('password')}
              autoComplete="current-password"
              className="h-[50px] text-base md:text-[15px]"
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

        <Button type="submit" variant={variant} fullWidth loading={login.isPending}>
          {submitLabel}
        </Button>

        {footer !== undefined && <p className="text-center text-[13px] font-bold text-muted">{footer}</p>}
      </form>
    </>
  )
}
