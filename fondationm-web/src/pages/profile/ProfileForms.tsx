import { useEffect, useState } from 'react'
import { errorFromException, errorMessage } from '../../api/errors'
import type { SchoolDetails, SpeakerDetails } from '../../auth/currentUser'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { FormField } from '../../components/ui/FormField'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { SCHOOL_TYPES, SCHOOL_TYPE_LABELS, SECTORS, sectorOptionLabel, type SchoolType, type Sector } from '../../lib/referenceData'
import { SkillPicker } from '../register/SkillPicker'
import { useSaveSchoolProfile, useSaveSpeakerProfile } from './profileData'

const PHONE = /^[0-9 +().-]{6,30}$/
const PHONE_ERROR = 'De 6 à 30 caractères : chiffres, espaces et + ( ) . - uniquement.'

function lengthError(value: string, max: number, requiredMessage?: string): string | undefined {
  const trimmed = value.trim()
  if (requiredMessage && trimmed === '') return requiredMessage
  return trimmed.length > max ? `${max} caractères maximum.` : undefined
}

function phoneError(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed === '' || PHONE.test(trimmed) ? undefined : PHONE_ERROR
}

/** Message d'un champ renvoyé par le serveur (`fieldErrors`). */
function serverField(failure: unknown, field: string): string | undefined {
  return failure === null ? undefined : errorFromException(failure).fieldErrors.find((error) => error.field === field)?.message
}

function SaveFeedback({ failure, saved, fields }: { failure: unknown; saved: boolean; fields: readonly string[] }) {
  const fieldErrors = failure === null ? [] : errorFromException(failure).fieldErrors
  const other = fieldErrors.filter((error) => !fields.includes(error.field))
  return (
    <>
      {failure !== null && (fieldErrors.length === 0 || other.length > 0) && (
        <Alert tone="error">
          {errorMessage(failure)}
          {other.length > 0 && (
            <ul className="list-disc pl-5">
              {other.map((error) => (
                <li key={`${error.field}-${error.message}`}>{error.message}</li>
              ))}
            </ul>
          )}
        </Alert>
      )}
      <div aria-live="polite" className="empty:hidden">
        {saved && <p className="rounded-block border-l-[6px] border-green bg-green-tint px-4 py-3 text-sm font-semibold text-green">Profil enregistré.</p>}
      </div>
    </>
  )
}

interface FormProps<T> {
  details: T
  onDirtyChange: (dirty: boolean) => void
}

/** Profil de l'intervenant (décision 132) : PATCH des seuls champs modifiés, compétences par leur propre PUT. */
export function SpeakerProfileForm({ details, onDirtyChange }: FormProps<SpeakerDetails>) {
  const initial: { jobTitle: string; organization: string; sector: Sector | ''; motivation: string; phone: string; skills: string[] } = {
    jobTitle: details.jobTitle,
    organization: details.organization,
    sector: details.sector ?? '',
    motivation: details.motivation,
    phone: details.phone,
    skills: details.skills,
  }
  const [values, setValues] = useState(initial)
  const [shown, setShown] = useState(false)
  const [saved, setSaved] = useState(false)
  const [failure, setFailure] = useState<unknown>(null)
  const save = useSaveSpeakerProfile()
  const skillsChanged = values.skills.join('\n') !== initial.skills.join('\n')
  const dirty =
    values.jobTitle.trim() !== initial.jobTitle ||
    values.organization.trim() !== initial.organization ||
    values.sector !== initial.sector ||
    values.motivation.trim() !== initial.motivation ||
    values.phone.trim() !== initial.phone ||
    skillsChanged

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange])

  const errors = {
    jobTitle: lengthError(values.jobTitle, 100, 'Indiquez votre métier.'),
    organization: lengthError(values.organization, 100),
    motivation: lengthError(values.motivation, 1000),
    phone: phoneError(values.phone),
    skills: values.skills.length === 0 ? 'Choisissez au moins une compétence.' : undefined,
  }
  const visible: Partial<typeof errors> = shown ? errors : {}

  function update(patch: Partial<typeof values>) {
    setSaved(false)
    setValues((current) => ({ ...current, ...patch }))
  }

  function submit() {
    setShown(true)
    setFailure(null)
    if (Object.values(errors).some(Boolean) || !dirty) return
    const patch: Record<string, string> = {}
    if (values.jobTitle.trim() !== initial.jobTitle) patch.jobTitle = values.jobTitle.trim()
    if (values.organization.trim() !== initial.organization) patch.organization = values.organization.trim()
    if (values.sector !== initial.sector && values.sector !== '') patch.sector = values.sector
    if (values.motivation.trim() !== initial.motivation) patch.motivation = values.motivation.trim()
    if (values.phone.trim() !== initial.phone) patch.phone = values.phone.trim()
    save.mutate(
      { patch, skills: skillsChanged ? values.skills : null },
      {
        onSuccess: () => {
          setSaved(true)
          setShown(false)
        },
        onError: (error) => setFailure(error),
      },
    )
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <FormField label="Votre métier" required error={visible.jobTitle ?? serverField(failure, 'jobTitle')}>
        {(control) => <Input {...control} value={values.jobTitle} maxLength={100} onChange={(event) => update({ jobTitle: event.target.value })} />}
      </FormField>
      <FormField label="Structure" labelNote="(facultatif)" error={visible.organization ?? serverField(failure, 'organization')}>
        {(control) => <Input {...control} value={values.organization} maxLength={100} onChange={(event) => update({ organization: event.target.value })} />}
      </FormField>
      <FormField label="Votre secteur" error={serverField(failure, 'sector')}>
        {(control) => (
          <Select {...control} value={values.sector} onChange={(event) => update({ sector: event.target.value as Sector })}>
            {initial.sector === '' && <option value="">Choisissez un secteur</option>}
            {SECTORS.map((sector) => (
              <option key={sector} value={sector}>
                {sectorOptionLabel(sector)}
              </option>
            ))}
          </Select>
        )}
      </FormField>
      <FormField label="Pourquoi voulez-vous transmettre ?" labelNote="(facultatif)" error={visible.motivation ?? serverField(failure, 'motivation')}>
        {(control) => (
          <Textarea {...control} rows={4} className="h-auto py-3" maxLength={1000} value={values.motivation} onChange={(event) => update({ motivation: event.target.value })} />
        )}
      </FormField>
      <FormField label="Téléphone" labelNote="(facultatif)" error={visible.phone ?? serverField(failure, 'phone')}>
        {(control) => <Input {...control} type="tel" value={values.phone} onChange={(event) => update({ phone: event.target.value })} />}
      </FormField>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-[13px] font-extrabold text-ink">Compétences</legend>
        <SkillPicker value={values.skills} onChange={(skills) => update({ skills })} error={visible.skills ?? serverField(failure, 'skills')} />
      </fieldset>
      <SaveFeedback failure={failure} saved={saved} fields={['jobTitle', 'organization', 'sector', 'motivation', 'phone', 'skills']} />
      <Button type="submit" size="md" loading={save.isPending} disabled={!dirty} className="self-start">
        Enregistrer mon profil
      </Button>
    </form>
  )
}

/** Profil de l'école : type, fonction du référent, téléphone (décision 132). */
export function SchoolProfileForm({ details, onDirtyChange }: FormProps<SchoolDetails>) {
  const initial: { schoolType: SchoolType | ''; referentRole: string; phone: string } = {
    schoolType: details.schoolType ?? '',
    referentRole: details.referentRole,
    phone: details.phone,
  }
  const [values, setValues] = useState(initial)
  const [shown, setShown] = useState(false)
  const [saved, setSaved] = useState(false)
  const [failure, setFailure] = useState<unknown>(null)
  const save = useSaveSchoolProfile()
  const dirty = values.schoolType !== initial.schoolType || values.referentRole.trim() !== initial.referentRole || values.phone.trim() !== initial.phone

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange])

  const errors = {
    referentRole: lengthError(values.referentRole, 100, 'Indiquez votre fonction.'),
    phone: phoneError(values.phone),
  }
  const visible: Partial<typeof errors> = shown ? errors : {}

  function update(patch: Partial<typeof values>) {
    setSaved(false)
    setValues((current) => ({ ...current, ...patch }))
  }

  function submit() {
    setShown(true)
    setFailure(null)
    if (Object.values(errors).some(Boolean) || !dirty) return
    const patch: { schoolType?: SchoolType; referentRole?: string; phone?: string } = {}
    if (values.schoolType !== initial.schoolType && values.schoolType !== '') patch.schoolType = values.schoolType
    if (values.referentRole.trim() !== initial.referentRole) patch.referentRole = values.referentRole.trim()
    if (values.phone.trim() !== initial.phone) patch.phone = values.phone.trim()
    save.mutate(patch, {
      onSuccess: () => {
        setSaved(true)
        setShown(false)
      },
      onError: (error) => setFailure(error),
    })
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <FormField label="Type" error={serverField(failure, 'schoolType')}>
        {(control) => (
          <Select {...control} value={values.schoolType} onChange={(event) => update({ schoolType: event.target.value as SchoolType })}>
            {initial.schoolType === '' && <option value="">Choisissez un type</option>}
            {SCHOOL_TYPES.map((type) => (
              <option key={type} value={type}>
                {SCHOOL_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        )}
      </FormField>
      <FormField label="Fonction" required error={visible.referentRole ?? serverField(failure, 'referentRole')}>
        {(control) => <Input {...control} value={values.referentRole} maxLength={100} onChange={(event) => update({ referentRole: event.target.value })} />}
      </FormField>
      <FormField label="Téléphone" labelNote="(facultatif)" error={visible.phone ?? serverField(failure, 'phone')}>
        {(control) => <Input {...control} type="tel" value={values.phone} onChange={(event) => update({ phone: event.target.value })} />}
      </FormField>
      <SaveFeedback failure={failure} saved={saved} fields={['schoolType', 'referentRole', 'phone']} />
      <Button type="submit" size="md" loading={save.isPending} disabled={!dirty} className="self-start">
        Enregistrer le profil
      </Button>
    </form>
  )
}
