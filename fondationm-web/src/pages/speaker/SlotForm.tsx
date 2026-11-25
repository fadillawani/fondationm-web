import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { errorFromException, errorMessage } from '../../api/errors'
import { Button } from '../../components/ui/Button'
import { ChoiceGroup } from '../../components/ui/ChoiceGroup'
import { FormField } from '../../components/ui/FormField'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import {
  atMinutes,
  dayKey,
  minutesLabel,
  parseDayKey,
  parseMinutes,
  startOfDay,
  toOffsetIso,
} from '../../lib/dateTime'
import { ONLINE_MEETINGS_ENABLED } from '../../lib/features'
import { useNow } from '../../lib/useNow'
import { SLOT_FORMAT_LABEL } from './speakerText'
import { useCreateSlot, type SlotFormats } from './speakerData'

const STEP = 15

/** « 8h00 » (maquette), la valeur du champ reste « 08:00 ». */
function hourLabel(minutes: number): string {
  return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`
}
const MIN_DURATION = 15
const MAX_DURATION = 8 * 60
const LAST_START = 24 * 60 - 2 * STEP
const START_OPTIONS = Array.from({ length: LAST_START / STEP + 1 }, (_, index) => index * STEP)
const END_OPTIONS = START_OPTIONS.map((minutes) => minutes + STEP)

const FORMAT_OPTIONS = (['IN_PERSON', 'ONLINE', 'BOTH'] as const).map((value) => ({
  value,
  label: SLOT_FORMAT_LABEL[value],
}))

interface SlotValues {
  day: string
  start: string
  end: string
}

// « À venir » s'apprécie au moment de la validation, pas au rendu.
const schema = z
    .object({ day: z.string(), start: z.string(), end: z.string() })
    .superRefine((values, context) => {
      const now = new Date()
      const day = parseDayKey(values.day)
      if (day === null) {
        context.addIssue({ code: 'custom', path: ['day'], message: 'Choisissez un jour.' })
        return
      }
      if (day.getTime() < startOfDay(now).getTime()) {
        context.addIssue({ code: 'custom', path: ['day'], message: 'Choisissez un jour à venir.' })
        return
      }
      const start = parseMinutes(values.start)
      const end = parseMinutes(values.end)
      if (start === null) {
        context.addIssue({ code: 'custom', path: ['start'], message: "Choisissez l'heure de début." })
      } else if (atMinutes(day, start).getTime() <= now.getTime()) {
        context.addIssue({ code: 'custom', path: ['start'], message: "L'heure de début doit être à venir." })
      }
      if (end === null) {
        context.addIssue({ code: 'custom', path: ['end'], message: "Choisissez l'heure de fin." })
      } else if (start !== null && end <= start) {
        context.addIssue({ code: 'custom', path: ['end'], message: 'La fin doit être après le début.' })
      } else if (start !== null && (end - start < MIN_DURATION || end - start > MAX_DURATION)) {
        context.addIssue({ code: 'custom', path: ['end'], message: 'Un créneau dure de 15 minutes à 8 heures.' })
      }
    })

const SERVER_FIELDS: Partial<Record<string, keyof SlotValues>> = { startAt: 'start', endAt: 'end' }

interface SlotFormProps {
  /** Jour imposé (calendrier) ; null : le jour se choisit dans le formulaire (téléphone). */
  day: Date | null
  city: string
}

export function SlotForm({ day, city }: SlotFormProps) {
  const now = useNow()
  const create = useCreateSlot()
  // Rencontres en classe seulement (F6.1) : le créneau est publié IN_PERSON, sans choix de format.
  const [formats, setFormats] = useState<SlotFormats>(ONLINE_MEETINGS_ENABLED ? 'BOTH' : 'IN_PERSON')
  const [formError, setFormError] = useState<string | null>(null)
  const [published, setPublished] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<SlotValues>({
    resolver: zodResolver(schema),
    defaultValues: { day: day ? dayKey(day) : '', start: '', end: '' },
  })

  function submit(values: SlotValues) {
    const date = parseDayKey(values.day)
    const start = parseMinutes(values.start)
    const end = parseMinutes(values.end)
    if (date === null || start === null || end === null) return
    setFormError(null)
    setPublished(false)
    create.mutate(
      { startAt: toOffsetIso(atMinutes(date, start)), endAt: toOffsetIso(atMinutes(date, end)), formats },
      {
        onSuccess: () => {
          setPublished(true)
          reset({ day: values.day, start: '', end: '' })
        },
        onError: (error) => {
          const apiError = errorFromException(error)
          if (apiError.code === 'SLOT_OVERLAP') {
            setFormError('Ce créneau chevauche un de vos créneaux existants.')
            return
          }
          let placed = false
          for (const fieldError of apiError.fieldErrors) {
            const name = SERVER_FIELDS[fieldError.field]
            if (name !== undefined) {
              setError(name, { type: 'server', message: fieldError.message }, { shouldFocus: !placed })
              placed = true
            }
          }
          if (!placed) setFormError(errorMessage(error))
        },
      },
    )
  }

  const where = city ? `celles de ${city} en premier` : 'celles de votre zone en premier'

  return (
    <form
      noValidate
      aria-label="Publier un créneau"
      className="flex flex-col gap-4"
      onSubmit={handleSubmit(submit)}
    >
      <h3 className="text-[21px] lg:text-[23px]">{day ? 'Publier un créneau ce jour-là' : 'Publier un créneau'}</h3>

      {day === null && (
        <FormField label="Jour" required error={errors.day?.message}>
          {(control) => <Input {...control} {...register('day')} type="date" min={dayKey(now)} />}
        </FormField>
      )}

      <div className="grid grid-cols-2 gap-3">
        <FormField label="De" required error={errors.start?.message}>
          {(control) => (
            <Select {...control} {...register('start')}>
              <option value="">Heure</option>
              {START_OPTIONS.map((minutes) => (
                <option key={minutes} value={minutesLabel(minutes)}>
                  {hourLabel(minutes)}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField label="À" required error={errors.end?.message}>
          {(control) => (
            <Select {...control} {...register('end')}>
              <option value="">Heure</option>
              {END_OPTIONS.map((minutes) => (
                <option key={minutes} value={minutesLabel(minutes)}>
                  {hourLabel(minutes)}
                </option>
              ))}
            </Select>
          )}
        </FormField>
      </div>

      {ONLINE_MEETINGS_ENABLED && (
        <div className="flex flex-col gap-1.5">
          <span aria-hidden="true" className="text-[13px] font-extrabold text-ink">
            Format
          </span>
          <ChoiceGroup label="Format" value={formats} onChange={setFormats} options={FORMAT_OPTIONS} />
        </div>
      )}

      <Button type="submit" size="md" loading={create.isPending}>
        Publier ce créneau
      </Button>
      <p className="text-[13px] font-semibold text-muted">
        Visible par toutes les écoles, {where}, tant qu'aucune rencontre n'y est confirmée.
      </p>

      {formError && (
        <p role="alert" className="text-sm font-bold text-red">
          {formError}
        </p>
      )}
      {published && (
        <p role="status" className="rounded-[12px] bg-[#E8EEDF] px-3.5 py-3 text-sm font-extrabold text-[#3B5221]">
          Créneau publié. Les écoles peuvent le voir dès maintenant.
        </p>
      )}
    </form>
  )
}
