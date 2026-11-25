import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useController, useForm } from 'react-hook-form'
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
import { Textarea } from '../../components/ui/Textarea'
import { SECTORS, SUGGESTED_CITIES, SUGGESTED_COUNTRIES, sectorOptionLabel } from '../../lib/referenceData'
import { applyServerFieldErrors } from '../../lib/serverFieldErrors'
import { CharterNote } from './CharterNote'
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

const STEPS = [
  'Présentez-vous et ce que vous transmettez',
  'La Fondation M valide votre compte',
  'Publiez vos créneaux, les écoles vous sollicitent',
] as const

export function RegisterSpeakerPage() {
  const registration = useRegister()
  const [formError, setFormError] = useState<unknown>(null)
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SpeakerFormInput, unknown, SpeakerFormValues>({
    resolver: zodResolver(speakerSchema),
    defaultValues: {
      fullName: '',
      jobTitle: '',
      organization: '',
      sector: '',
      country: '',
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
      tone="orange"
      wide
      eyebrow="Espace intervenant"
      title="Votre métier peut changer un avenir"
      intro="Une heure de votre temps, c'est parfois le déclic d'une classe entière. Partagez ce que vous faites, vos débuts, vos doutes : c'est ce que les jeunes retiennent."
      mobileIntro="Une heure de votre temps, c'est parfois le déclic d'une classe entière."
      steps={STEPS}
    >
      <AuthTabs activeLabel="Créer un compte" activeTone="ink" />

      <div>
        <h1 className="text-[32px] leading-tight">Créer mon compte intervenant</h1>
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
            <FormField label="Métier" error={errors.jobTitle?.message} required>
              {(fieldProps) => <Input {...fieldProps} {...register('jobTitle')} autoComplete="organization-title" />}
            </FormField>
            <FormField label="Structure (facultatif)" error={errors.organization?.message}>
              {(fieldProps) => <Input {...fieldProps} {...register('organization')} autoComplete="organization" />}
            </FormField>
          </div>
          <FormField label="Secteur" error={errors.sector?.message} required>
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
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Pays" error={errors.country?.message} required>
              {(fieldProps) => (
                <Input {...fieldProps} {...register('country')} list="pays-suggeres" autoComplete="country-name" />
              )}
            </FormField>
            <FormField label="Zone (ville)" error={errors.city?.message} required>
              {(fieldProps) => (
                <Input {...fieldProps} {...register('city')} list="villes-suggerees" autoComplete="address-level2" />
              )}
            </FormField>
          </div>
          <Suggestions id="pays-suggeres" options={SUGGESTED_COUNTRIES} />
          <Suggestions id="villes-suggerees" options={SUGGESTED_CITIES} />
        </Fieldset>

        <Fieldset legend="Ce que vous transmettez">
          <SkillPicker
            value={skillsField.value}
            onChange={skillsField.onChange}
            error={errors.skills?.message}
            inputRef={skillsField.ref}
          />
          <FormField
            label="Pourquoi voulez-vous transmettre ? (facultatif, visible par les écoles)"
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
          <FormField label="Mot de passe" hint="8 caractères minimum" error={errors.password?.message} required>
            {(fieldProps) => <PasswordInput {...fieldProps} {...register('password')} autoComplete="new-password" />}
          </FormField>
        </Fieldset>

        <div className="flex flex-col gap-1">
          <Checkbox
            {...register('charterAccepted')}
            error={errors.charterAccepted?.message}
            label="J'accepte la charte des intervenants. Je comprends que mes coordonnées ne sont jamais transmises aux écoles."
          />
          <CharterNote />
        </div>

        {formError !== null && <Alert tone="error">{errorMessage(formError)}</Alert>}

        <div className="flex flex-col gap-3">
          <Button type="submit" fullWidth loading={registration.isPending}>
            Envoyer ma demande
          </Button>
          <p className="text-center text-[13px] font-semibold text-muted">
            La Fondation M valide chaque intervenant avant l'ouverture du compte.
          </p>
        </div>
      </form>
    </AuthSplitLayout>
  )
}
