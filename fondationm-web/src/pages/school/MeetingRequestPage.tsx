import { zodResolver } from '@hookform/resolvers/zod'
import { useState, type ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useParams } from 'react-router'
import { z } from 'zod'
import { errorFromException, errorMessage } from '../../api/errors'
import { PATHS } from '../../auth/roles'
import { BackIcon } from '../../components/layout/icons'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { ChoiceGroup } from '../../components/ui/ChoiceGroup'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { FormField } from '../../components/ui/FormField'
import { Input } from '../../components/ui/Input'
import { Spinner } from '../../components/ui/Spinner'
import { buttonClass } from '../../components/ui/styles'
import { Textarea } from '../../components/ui/Textarea'
import { cn } from '../../lib/cn'
import { formatDayMonth, formatSlot, formatTimeRange, formatWeekday, parseIso } from '../../lib/dateTime'
import { NewClassForm } from './NewClassForm'
import {
  useClasses,
  useCreateMeeting,
  useRefreshSpeaker,
  useSpeakerDetail,
  type AvailableSlot,
  type MeetingFormat,
  type SchoolClass,
  type SpeakerDetail,
} from './schoolData'
import { SpeakerAvatar } from './SpeakerCard'

const FORMAT_LABEL: Record<MeetingFormat, string> = { IN_PERSON: 'En classe', ONLINE: 'En ligne' }

const schema = z.object({
  slotId: z.string(),
  classId: z.string(),
  format: z.string(),
  place: z.string(),
  message: z.string().max(1000, '1000 caractères maximum.'),
})

type RequestValues = z.infer<typeof schema>

/** Messages dédiés, par code (quel que soit le statut HTTP). */
const ERROR_MESSAGES: Partial<Record<string, string>> = {
  SLOT_NOT_AVAILABLE: "Ce créneau n'est plus disponible. Choisissez-en un autre.",
  SLOT_PASSED: 'Ce créneau est déjà passé. Choisissez-en un autre.',
  CLASS_SLOT_OVERLAP: 'Cette classe a déjà une rencontre à ce moment-là. Choisissez un autre créneau ou une autre classe.',
  CLASS_FULL: 'Cette classe ne peut plus recevoir de nouvelle demande pour le moment.',
}
const SLOT_ERRORS = new Set(['SLOT_NOT_AVAILABLE', 'SLOT_PASSED'])
const SERVER_FIELDS: Partial<Record<string, keyof RequestValues>> = {
  slotId: 'slotId',
  classId: 'classId',
  format: 'format',
  place: 'place',
  message: 'message',
}

function firstName(fullName: string): string {
  return fullName.split(/\s+/)[0] ?? fullName
}

function formatOf(slot: AvailableSlot | undefined, chosen: string): MeetingFormat | null {
  if (slot === undefined) return null
  if (slot.formats !== 'BOTH') return slot.formats
  return chosen === 'IN_PERSON' || chosen === 'ONLINE' ? chosen : null
}

function slotLabel(slot: AvailableSlot | undefined): string | null {
  const start = parseIso(slot?.startAt ?? null)
  const end = parseIso(slot?.endAt ?? null)
  return start && end ? formatSlot(start, end) : null
}

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  const id = `etape-${number}`
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 rounded-[22px] bg-surface p-5 shadow-card">
      <h2 id={id} className="flex items-center gap-3 text-xl text-ink">
        <span aria-hidden="true" className="inline-flex size-9 items-center justify-center rounded-pill bg-terra font-display text-white">
          {number}
        </span>
        {title}
      </h2>
      {children}
    </section>
  )
}

function radioCard(checked: boolean): string {
  return cn(
    'flex min-h-touch cursor-pointer flex-col gap-0.5 rounded-block p-4 transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink',
    checked ? 'border-[3px] border-terra bg-cream' : 'border-2 border-line bg-surface hover:border-muted',
  )
}

interface SentState {
  speaker: string
  date: string | null
  classTitle: string
}

function RequestSent({ sent }: { sent: SentState }) {
  return (
    <section role="status" aria-labelledby="demande-envoyee" className="flex flex-col gap-4 rounded-[22px] bg-surface p-6 shadow-card">
      <h2 id="demande-envoyee" className="text-[28px] text-ink">
        Demande envoyée
      </h2>
      <dl className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Intervenant', value: sent.speaker },
          { label: 'Date', value: sent.date },
          { label: 'Classe', value: sent.classTitle },
        ].map((fact) =>
          fact.value ? (
            <div key={fact.label} className="flex flex-col">
              <dt className="text-xs font-black uppercase tracking-[0.08em] text-muted">{fact.label}</dt>
              <dd className="font-bold text-ink">{fact.value}</dd>
            </div>
          ) : null,
        )}
      </dl>
      <p className="font-semibold text-muted">
        {firstName(sent.speaker)} et la Fondation M vont chacune répondre à votre demande.
      </p>
      <Link to={PATHS.schoolSpeakers} className={cn(buttonClass('primary', { size: 'md' }), 'self-start')}>
        Retour aux intervenants
      </Link>
    </section>
  )
}

function RequestForm({ speaker }: { speaker: SpeakerDetail }) {
  const classes = useClasses()
  const create = useCreateMeeting()
  const refreshSpeaker = useRefreshSpeaker(speaker.id)
  const [addingClass, setAddingClass] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [sent, setSent] = useState<SentState | null>(null)
  const prenom = firstName(speaker.fullName)
  const slots = speaker.slots
  const classList = classes.data?.items ?? []

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    control,
    formState: { errors },
  } = useForm<RequestValues>({
    resolver: zodResolver(
      schema.superRefine((values, context) => {
        const slot = slots.find((entry) => entry.id === values.slotId)
        if (slot === undefined) context.addIssue({ code: 'custom', path: ['slotId'], message: 'Choisissez un créneau.' })
        if (!classList.some((entry) => entry.id === values.classId)) {
          context.addIssue({ code: 'custom', path: ['classId'], message: 'Choisissez une classe.' })
        }
        const format = formatOf(slot, values.format)
        if (slot !== undefined && format === null) {
          context.addIssue({ code: 'custom', path: ['format'], message: 'Choisissez le format de la rencontre.' })
        }
        const place = values.place.trim()
        if (format === 'IN_PERSON' && place.length === 0) {
          context.addIssue({ code: 'custom', path: ['place'], message: 'Indiquez où aura lieu la rencontre.' })
        }
        if (place.length > 150) context.addIssue({ code: 'custom', path: ['place'], message: '150 caractères maximum.' })
      }),
    ),
    defaultValues: { slotId: '', classId: '', format: '', place: '', message: '' },
  })

  const values = useWatch({ control })
  const slot = slots.find((entry) => entry.id === values.slotId)
  const chosenClass: SchoolClass | undefined = classList.find((entry) => entry.id === values.classId)
  const format = formatOf(slot, values.format ?? '')

  function classCreated(created: SchoolClass) {
    setAddingClass(false)
    setValue('classId', created.id, { shouldValidate: true })
  }

  const submit = handleSubmit((form) => {
    const chosenSlot = slots.find((entry) => entry.id === form.slotId)
    const meetingFormat = formatOf(chosenSlot, form.format)
    if (chosenSlot === undefined || meetingFormat === null) return
    setFormError(null)
    const place = form.place.trim()
    const message = form.message.trim()
    create.mutate(
      {
        classId: form.classId,
        slotId: form.slotId,
        format: meetingFormat,
        ...(place ? { place } : {}),
        ...(message ? { message } : {}),
      },
      {
        onSuccess: () =>
          setSent({
            speaker: speaker.fullName,
            date: slotLabel(chosenSlot),
            classTitle: classList.find((entry) => entry.id === form.classId)?.title ?? '',
          }),
        onError: (error) => {
          const apiError = errorFromException(error)
          if (SLOT_ERRORS.has(apiError.code)) {
            setValue('slotId', '')
            void refreshSpeaker()
          }
          let placed = false
          for (const fieldError of apiError.fieldErrors) {
            const name = SERVER_FIELDS[fieldError.field]
            if (name !== undefined) {
              setError(name, { type: 'server', message: fieldError.message }, { shouldFocus: !placed })
              placed = true
            }
          }
          if (!placed) setFormError(ERROR_MESSAGES[apiError.code] ?? errorMessage(error))
        },
      },
    )
  })

  if (sent !== null) return <RequestSent sent={sent} />

  const summary = [
    { label: 'Intervenant', value: speaker.fullName },
    { label: 'Date', value: slotLabel(slot) },
    { label: 'Classe', value: chosenClass ? chosenClass.title : null },
    { label: 'Format', value: format ? FORMAT_LABEL[format] : null },
    { label: 'Lieu', value: values.place?.trim() || null },
  ]

  return (
    <form noValidate aria-label="Demander une rencontre" onSubmit={(event) => void submit(event)} className="flex flex-col gap-5">
      <Step number={1} title="Quand ?">
        {slots.length === 0 ? (
          <p className="font-semibold text-muted">{prenom} n'a pas de créneau libre pour l'instant.</p>
        ) : (
          <fieldset aria-describedby={errors.slotId ? 'erreur-creneau' : undefined}>
            <legend className="sr-only">Créneau</legend>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {slots.map((entry) => {
                const start = parseIso(entry.startAt)
                const end = parseIso(entry.endAt)
                if (start === null || end === null) return null
                const checked = values.slotId === entry.id
                return (
                  <label key={entry.id} className={radioCard(checked)}>
                    <input
                      type="radio"
                      value={entry.id}
                      {...register('slotId', { onChange: () => clearErrors('format') })}
                      className="sr-only"
                    />
                    <span className="font-extrabold text-terra">{formatWeekday(start)}</span>
                    <span className="font-display text-xl text-ink">{formatDayMonth(start)}</span>
                    <span className="font-bold text-ink">{formatTimeRange(start, end)}</span>
                    <span className="text-sm font-semibold text-muted">
                      {entry.formats === 'BOTH' ? 'En classe ou en ligne' : FORMAT_LABEL[entry.formats]}
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>
        )}
        {errors.slotId?.message && (
          <p id="erreur-creneau" className="text-sm font-bold text-red">
            {errors.slotId.message}
          </p>
        )}
      </Step>

      <Step number={2} title="Pour quelle classe ?">
        {classes.isPending ? (
          <Spinner label="Chargement des classes…" />
        ) : classes.isError ? (
          <ErrorState message={errorMessage(classes.error)} onRetry={() => void classes.refetch()} retrying={classes.isFetching} />
        ) : (
          <>
            {classList.length === 0 ? (
              <>
                <p className="font-semibold text-muted">
                  Vous n'avez pas encore de classe. Ajoutez-en une pour envoyer votre demande.
                </p>
                <NewClassForm onCreated={classCreated} />
              </>
            ) : (
              <>
                <fieldset aria-describedby={errors.classId ? 'erreur-classe' : undefined}>
                  <legend className="sr-only">Classe</legend>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {classList.map((entry) => (
                      <label key={entry.id} className={radioCard(values.classId === entry.id)}>
                        <input type="radio" value={entry.id} {...register('classId')} className="sr-only" />
                        <span className="font-extrabold text-ink">{entry.title}</span>
                        {entry.studentCount !== null && (
                          <span className="text-sm font-semibold text-muted">{entry.studentCount} élèves</span>
                        )}
                      </label>
                    ))}
                  </div>
                </fieldset>
                {addingClass ? (
                  <NewClassForm onCreated={classCreated} onCancel={() => setAddingClass(false)} />
                ) : (
                  <Button variant="ghost" size="md" className="self-start" onClick={() => setAddingClass(true)}>
                    + Ajouter une classe
                  </Button>
                )}
              </>
            )}
            {errors.classId?.message && (
              <p id="erreur-classe" className="text-sm font-bold text-red">
                {errors.classId.message}
              </p>
            )}
          </>
        )}
      </Step>

      <Step number={3} title="Présentez vos élèves">
        {slot !== undefined && (
          <div className="flex flex-col gap-1.5">
            <span aria-hidden="true" className="text-[13px] font-extrabold text-ink">
              Format
            </span>
            {slot.formats === 'BOTH' ? (
              <ChoiceGroup
                label="Format de la rencontre"
                value={values.format === 'IN_PERSON' || values.format === 'ONLINE' ? values.format : ''}
                onChange={(value) => setValue('format', value, { shouldValidate: true })}
                options={[
                  { value: 'IN_PERSON', label: 'En classe' },
                  { value: 'ONLINE', label: 'En ligne' },
                ]}
              />
            ) : (
              <p className="font-bold text-ink">{FORMAT_LABEL[slot.formats]} (format du créneau)</p>
            )}
            {errors.format?.message && <p className="text-sm font-bold text-red">{errors.format.message}</p>}
          </div>
        )}
        <FormField label="Où aura lieu la rencontre ?" required={format === 'IN_PERSON'} error={errors.place?.message}>
          {(field) => <Input {...field} {...register('place')} maxLength={150} placeholder="Ex. : salle 12, bâtiment B" />}
        </FormField>
        <FormField label={`Un mot pour ${prenom} (facultatif)`} error={errors.message?.message}>
          {(field) => <Textarea {...field} {...register('message')} maxLength={1000} />}
        </FormField>
      </Step>

      <Step number={4} title="Vérifiez votre demande">
        <dl aria-live="polite" className="grid gap-3 sm:grid-cols-2">
          {summary.map((fact) => (
            <div key={fact.label} className="flex flex-col">
              <dt className="text-xs font-black uppercase tracking-[0.08em] text-muted">{fact.label}</dt>
              <dd className="font-bold text-ink">{fact.value ?? '—'}</dd>
            </div>
          ))}
        </dl>
      </Step>

      {formError && <Alert tone="error">{formError}</Alert>}

      <div className="flex flex-col gap-3 rounded-[22px] bg-cream-soft p-5">
        <p className="font-semibold text-ink">
          {prenom} et la Fondation M vont chacune répondre à votre demande. Vous suivrez leurs réponses dans « Mes
          rencontres ».
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={create.isPending}>
            Envoyer la demande
          </Button>
          <Link to={PATHS.schoolSpeakers} className={buttonClass('outline', { size: 'lg' })}>
            Annuler
          </Link>
        </div>
      </div>
    </form>
  )
}

export function MeetingRequestPage() {
  const { id = '' } = useParams()
  const speaker = useSpeakerDetail(id)

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Fil d'Ariane" className="hidden md:block">
        <ol className="flex gap-2 text-sm font-bold text-muted">
          <li>
            <Link to={PATHS.schoolSpeakers} className="text-indigo underline">
              Intervenants
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">Demande de rencontre</li>
        </ol>
      </nav>
      <Link
        to={PATHS.schoolSpeakers}
        className="inline-flex min-h-touch items-center gap-2 self-start font-extrabold text-indigo md:hidden"
      >
        <BackIcon className="size-5" />
        Retour aux intervenants
      </Link>
      <h1 className="text-[32px] leading-tight text-ink md:text-[40px]">Demander une rencontre</h1>

      {speaker.isPending ? (
        <div className="flex justify-center py-10 text-terra">
          <Spinner label="Chargement de l'intervenant…" size="lg" />
        </div>
      ) : speaker.isError ? (
        errorFromException(speaker.error).status === 404 ? (
          <EmptyState
            title="Cet intervenant n'est plus disponible."
            action={
              <Link to={PATHS.schoolSpeakers} className={buttonClass('primary', { size: 'md' })}>
                Retour aux intervenants
              </Link>
            }
          />
        ) : (
          <ErrorState message={errorMessage(speaker.error)} onRetry={() => void speaker.refetch()} retrying={speaker.isFetching} />
        )
      ) : (
        <>
          <section aria-labelledby="vous-invitez" className="flex flex-col gap-3 rounded-[22px] bg-surface p-5 shadow-card">
            <p id="vous-invitez" className="text-xs font-black uppercase tracking-[0.12em] text-terra">
              Vous invitez
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <SpeakerAvatar speaker={speaker.data} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="font-display text-2xl text-ink">{speaker.data.fullName}</p>
                <p className="font-semibold text-muted">
                  {[speaker.data.jobTitle, speaker.data.organization, speaker.data.city].filter(Boolean).join(' · ')}
                </p>
              </div>
              <Link to={PATHS.schoolSpeakers} className="inline-flex min-h-touch items-center font-extrabold text-indigo underline">
                Changer d'intervenant
              </Link>
            </div>
            {speaker.data.motivation && (
              <blockquote className="whitespace-pre-line rounded-block border-l-[6px] border-orange bg-canvas px-4 py-3 font-semibold italic text-ink">
                {speaker.data.motivation}
              </blockquote>
            )}
          </section>
          <RequestForm speaker={speaker.data} />
        </>
      )}
    </div>
  )
}
