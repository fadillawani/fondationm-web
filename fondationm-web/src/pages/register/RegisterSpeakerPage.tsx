import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useController, useForm, useWatch } from 'react-hook-form'
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
import { Textarea } from '../../components/ui/Textarea'
import { DEFAULT_COUNTRY } from '../../lib/places'
import { SECTORS, sectorOptionLabel } from '../../lib/referenceData'
import { applyServerFieldErrors } from '../../lib/serverFieldErrors'
import { SPEAKER_COLUMN } from './authColumns'
import { PlaceFields } from './PlaceFields'
import { speakerSchema, type SpeakerFormInput, type SpeakerFormValues } from './schemas'
import { SkillPicker } from './SkillPicker'

const FIELDS = [
  'fullName',
  'jobTitle',
  'organization',
  'sector',
  'country',
  'city',
  'skills',
  'motivation',
  'email',
  'phone',
  'password',
  'charterAccepted',
] as const satisfies readonly (keyof SpeakerFormInput)[]

export function RegisterSpeakerPage() {
  const registration = useRegister()
  const [formError, setFormError] = useState<unknown>(null)
  const {
    control,
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<SpeakerFormInput, unknown, SpeakerFormValues>({
    resolver: zodResolver(speakerSchema),
    defaultValues: {
      fullName: '',
      jobTitle: '',
      organization: '',
      sector: '',
      country: DEFAULT_COUNTRY,
      city: '',
      skills: [],
      motivation: '',
      email: '',
      phone: '',
      password: '',
      charterAccepted: false,
    },
  })
  const { field: skillsField } = useController({ control, name: 'skills' })
  const country = useWatch({ control, name: 'country' })

  const submit = (values: SpeakerFormValues) => {
    setFormError(null)
    registration.mutate(
      { kind: 'speaker', body: { ...values, charterAccepted: true } },
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
      {...SPEAKER_COLUMN}
      wide
    >
      <AuthTabs persona="speaker" active="register" />

      <div>
        <h1 className="text-[26px] leading-tight md:text-[30px]">Créer mon compte intervenant</h1>
        <p className="mt-1 text-sm font-semibold text-muted">
          Votre ville permet aux écoles proches de vous trouver en premier.
        </p>
      </div>

      <form noValidate onSubmit={handleSubmit(submit)} className="flex flex-col gap-8">
        <Fieldset legend="Vous">
          <FormField label="Prénom et nom" error={errors.fullName?.message} required>
            {(fieldProps) => <Input {...fieldProps} {...register('fullName')} autoComplete="name" />}
          </FormField>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Votre métier" error={errors.jobTitle?.message} required>
              {(fieldProps) => <Input {...fieldProps} {...register('jobTitle')} autoComplete="organization-title" />}
            </FormField>
            <FormField label="Structure" labelNote="(facultatif)" error={errors.organization?.message}>
              {(fieldProps) => <Input {...fieldProps} {...register('organization')} autoComplete="organization" />}
            </FormField>
          </div>
          <FormField
            label="Votre secteur"
            hint="Le secteur principal de votre métier. Il aide les écoles à vous trouver."
            hintTone="muted"
            error={errors.sector?.message}
            required
          >
            {(fieldProps) => (
              <Select {...fieldProps} {...register('sector')}>
                <option value="">Choisir…</option>
                {SECTORS.map((sector) => (
                  <option key={sector} value={sector}>
                    {sectorOptionLabel(sector)}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
          <PlaceFields
            country={country}
            countryField={register('country', { onChange: () => setValue('city', '') })}
            cityField={register('city')}
            countryError={errors.country?.message}
            cityError={errors.city?.message}
          />
        </Fieldset>

        <Fieldset legend="Ce que vous transmettez">
          <SkillPicker
            value={skillsField.value}
            onChange={skillsField.onChange}
            error={errors.skills?.message}
            inputRef={skillsField.ref}
          />
          <FormField
            label="Pourquoi voulez-vous transmettre ?"
            labelNote="(facultatif, visible par les écoles)"
            error={errors.motivation?.message}
          >
            {(fieldProps) => <Textarea {...fieldProps} {...register('motivation')} />}
          </FormField>
        </Fieldset>

        <Fieldset legend="Connexion">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="E-mail" error={errors.email?.message} required>
              {(fieldProps) => (
                <Input {...fieldProps} {...register('email')} type="email" inputMode="email" autoComplete="email" />
              )}
            </FormField>
            <FormField label="Téléphone" error={errors.phone?.message} required>
              {(fieldProps) => (
                <Input {...fieldProps} {...register('phone')} type="tel" inputMode="tel" autoComplete="tel" />
              )}
            </FormField>
          </div>
          <FormField
            label="Mot de passe"
            hint="8 caractères minimum"
            hintTone="darkGreen"
            error={errors.password?.message}
            required
          >
            {(fieldProps) => <PasswordInput {...fieldProps} {...register('password')} autoComplete="new-password" />}
          </FormField>
        </Fieldset>

        <Checkbox
          {...register('charterAccepted')}
          error={errors.charterAccepted?.message}
          label="J'accepte la charte des intervenants. Je comprends que mes coordonnées ne sont jamais transmises aux écoles."
        />

        {formError !== null && <Alert tone="error">{errorMessage(formError)}</Alert>}

        <div className="flex flex-col gap-3">
          <Button type="submit" fullWidth loading={registration.isPending}>
            Envoyer ma demande
          </Button>
          <p className="text-center text-[13px] font-bold text-muted">
            La Fondation M valide chaque intervenant avant l'ouverture du compte.
          </p>
        </div>
      </form>
    </AuthSplitLayout>
  )
}
