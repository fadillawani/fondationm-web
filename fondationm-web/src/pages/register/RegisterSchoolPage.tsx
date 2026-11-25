import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { errorMessage } from '../../api/errors'
import { useRegister } from '../../auth/hooks'
import { AuthSplitLayout } from '../../components/layout/AuthSplitLayout'
import { AuthTabs } from '../../components/layout/AuthTabs'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Checkbox } from '../../components/ui/Checkbox'
import { Fieldset } from '../../components/ui/Fieldset'
import { FormField } from '../../components/ui/FormField'
import { Input } from '../../components/ui/Input'
import { PasswordInput } from '../../components/ui/PasswordInput'
import { Select } from '../../components/ui/Select'
import { Suggestions } from '../../components/ui/Suggestions'
import {
  SCHOOL_TYPES,
  SCHOOL_TYPE_LABELS,
  SUGGESTED_CITIES,
  SUGGESTED_COUNTRIES,
} from '../../lib/referenceData'
import { applyServerFieldErrors } from '../../lib/serverFieldErrors'
import { schoolSchema, type SchoolFormInput, type SchoolFormValues } from './schemas'

const FIELDS = [
  'schoolName',
  'schoolType',
  'country',
  'city',
  'referentRole',
  'email',
  'phone',
  'password',
  'charterAccepted',
] as const satisfies readonly (keyof SchoolFormInput)[]

const STEPS = [
  'Créez le compte de votre établissement',
  'La Fondation M vérifie et ouvre votre accès',
  'Choisissez un intervenant et demandez une rencontre',
] as const

export function RegisterSchoolPage() {
  const registration = useRegister()
  const [formError, setFormError] = useState<unknown>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SchoolFormInput, unknown, SchoolFormValues>({
    resolver: zodResolver(schoolSchema),
    defaultValues: {
      schoolName: '',
      schoolType: '',
      country: '',
      city: '',
      referentRole: '',
      email: '',
      phone: '',
      password: '',
      charterAccepted: false,
    },
  })

  const submit = (values: SchoolFormValues) => {
    setFormError(null)
    registration.mutate(
      { kind: 'school', body: { ...values, charterAccepted: true } },
      {
        onError: (error) => {
          const attached = applyServerFieldErrors(error, setError, { fields: FIELDS, emailField: 'email' })
          if (!attached) setFormError(error)
        },
      },
    )
  }

  return (
    <AuthSplitLayout
      tone="terra"
      wide
      eyebrow="Espace établissement"
      title="Ouvrez les métiers à vos élèves"
      intro="Des professionnels bénévoles viennent dans vos classes, ou en ligne, pour parler de leur métier. La Fondation M accompagne chaque rencontre."
      mobileIntro="Des professionnels bénévoles rencontrent vos classes. La Fondation M accompagne chaque rencontre."
      steps={STEPS}
    >
      <AuthTabs activeLabel="Créer un compte" activeTone="indigo" />

      <div>
        <h1 className="text-[26px] leading-tight md:text-[30px]">Créer le compte de l'établissement</h1>
        <p className="mt-1 text-sm font-semibold text-muted">
          Votre zone permet de vous proposer d'abord les intervenants proches de chez vous.
        </p>
      </div>

      <form noValidate onSubmit={handleSubmit(submit)} className="flex flex-col gap-8">
        <Fieldset legend="Établissement">
          <FormField label="Nom de l'établissement" error={errors.schoolName?.message} required>
            {(control) => <Input {...control} {...register('schoolName')} autoComplete="organization" />}
          </FormField>
          <FormField label="Type" error={errors.schoolType?.message} required>
            {(control) => (
              <Select {...control} {...register('schoolType')}>
                <option value="">Choisir…</option>
                {SCHOOL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {SCHOOL_TYPE_LABELS[type]}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Pays" error={errors.country?.message} required>
              {(control) => (
                <Input {...control} {...register('country')} list="pays-suggeres" autoComplete="country-name" />
              )}
            </FormField>
            <FormField label="Zone (ville)" error={errors.city?.message} required>
              {(control) => (
                <Input
                  {...control}
                  {...register('city')}
                  list="villes-suggerees"
                  autoComplete="address-level2"
                  className={errors.city ? undefined : 'border-terra font-bold'}
                />
              )}
            </FormField>
          </div>
          <Suggestions id="pays-suggeres" options={SUGGESTED_COUNTRIES} />
          <Suggestions id="villes-suggerees" options={SUGGESTED_CITIES} />
        </Fieldset>

        <Fieldset legend="Référent">
          <FormField label="Fonction" error={errors.referentRole?.message} required>
            {(control) => <Input {...control} {...register('referentRole')} autoComplete="organization-title" />}
          </FormField>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="E-mail professionnel" error={errors.email?.message} required>
              {(control) => (
                <Input {...control} {...register('email')} type="email" inputMode="email" autoComplete="email" />
              )}
            </FormField>
            <FormField label="Téléphone" error={errors.phone?.message} required>
              {(control) => (
                <Input {...control} {...register('phone')} type="tel" inputMode="tel" autoComplete="tel" />
              )}
            </FormField>
          </div>
          <FormField label="Mot de passe" hint="8 caractères minimum" error={errors.password?.message} required>
            {(control) => <PasswordInput {...control} {...register('password')} autoComplete="new-password" />}
          </FormField>
        </Fieldset>

        <Checkbox
          {...register('charterAccepted')}
          error={errors.charterAccepted?.message}
          label="J'accepte la charte des rencontres de la Fondation M et je confirme représenter cet établissement."
        />

        {formError !== null && <Alert tone="error">{errorMessage(formError)}</Alert>}

        <div className="flex flex-col gap-3">
          <Button type="submit" fullWidth loading={registration.isPending}>
            Envoyer la demande de compte
          </Button>
          <p className="text-center text-[13px] font-bold text-muted">
            La Fondation M vérifie chaque établissement avant d'ouvrir l'accès.
          </p>
        </div>
      </form>
    </AuthSplitLayout>
  )
}
