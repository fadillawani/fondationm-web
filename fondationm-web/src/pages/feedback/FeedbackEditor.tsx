import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { errorFromException, errorMessage } from '../../api/errors'
import { PATHS, feedbackFormPath } from '../../auth/roles'
import { LeaveGuardModal } from '../../components/access/LeaveGuardModal'
import { useLeaveGuard } from '../../components/access/useLeaveGuard'
import { PageTitle } from '../../components/layout/PageTitle'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { FormField } from '../../components/ui/FormField'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { cn } from '../../lib/cn'
import { MINUTE_MS, formatCompactDay, formatTime, parseIso } from '../../lib/dateTime'
import { initialsOf } from '../../lib/initials'
import { clearDraft, readDraft, saveDraft } from './feedbackDraft'
import { useSaveFeedback, type MyFeedback } from './feedbackData'
import { FeedbackContent } from './FeedbackContent'
import { COMMENT_MAX, STORY_MAX, durationLabel } from './feedbackFormat'
import { DURATION_OPTIONS, checkFeedback, classSummary, initialValues, type FeedbackField, type FeedbackValues } from './feedbackForm'
import { ChipGroup, FeedbackStepper, RatingPicker, StepBadge } from './FeedbackParts'
import {
  PRIVACY_NOTE,
  PUPIL_OPTIONS,
  SCHOOL_EMOTIONS,
  SPEAKER_EMOTIONS,
  stepOf,
  storyFields,
  type FeedbackRole,
  type FeedbackStep,
} from './feedbackText'

/** Rencontre décrite dans l'en-tête et l'encart « La rencontre ». */
export interface FeedbackMeetingContext {
  meetingId: string
  /** École : l'intervenant ; intervenant : l'établissement. */
  partnerName: string
  partnerDetail: string
  classTitle: string
  studentCount: number | null
  startAt: string | null
  endAt: string | null
  place: string | null
}

export interface OtherFeedback {
  meetingId: string
  name: string
  startAt: string | null
  step: FeedbackStep
}

interface FeedbackEditorProps {
  role: FeedbackRole
  userId: string
  context: FeedbackMeetingContext
  existing: MyFeedback | null
  others: readonly OtherFeedback[]
}

const DAY_MONTH_SHORT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name
}

/** « Lycée de Thiaroye » → « Thiaroye », « Centre de formation Saint-Louis » → « Saint-Louis » (titre W2-E10). */
function schoolPlace(name: string): string {
  const rest = name.replace(/^(lycée|collège|cem|école|institut|complexe scolaire|centre de formation)(\s+(de la|de l’|de l'|des|du|de|d’|d'))?\s*/iu, '').trim()
  return rest === '' ? name : rest
}

function pageTitle(role: FeedbackRole, context: FeedbackMeetingContext): string {
  if (role === 'school') return `Comment s'est passée la rencontre avec ${firstName(context.partnerName)} ?`
  return context.classTitle
    ? `Qu'avez-vous vécu avec les ${context.classTitle} de ${schoolPlace(context.partnerName)} ?`
    : `Qu'avez-vous vécu au ${context.partnerName} ?`
}

const SUBTITLE: Record<FeedbackRole, { pc: string; mobile: string }> = {
  school: {
    pc: "Racontez-nous ce que vous avez vécu, avec vos mots. Il n'y a pas de bonne ou de mauvaise réponse : ce sont les histoires qui comptent.",
    mobile: 'Racontez-nous ce que vous avez vécu, avec vos mots. Ce sont les histoires qui comptent.',
  },
  speaker: {
    pc: 'Prenez cinq minutes pour raconter. Pas de bonne réponse : votre ressenti est exactement ce que nous voulons lire.',
    mobile: 'Cinq minutes pour raconter. Votre ressenti est exactement ce que nous voulons lire.',
  },
}

const WHY: Record<FeedbackRole, { title: string; pc: string; mobile: string }> = {
  school: {
    title: 'Pourquoi votre récit compte',
    pc: 'Les chiffres disent combien d’élèves étaient là. Votre récit dit ce qui s’est passé pour eux. Une fois validé par la Fondation M, il est partagé avec les donateurs qui rendent ces rencontres possibles.',
    mobile: 'Une fois validé par la Fondation M, votre récit est partagé avec les donateurs qui rendent ces rencontres possibles.',
  },
  speaker: {
    title: 'Que devient votre récit ?',
    pc: 'La Fondation M le lit et le valide, sans le modifier : c’est votre regard. Il rejoint ensuite le rapport d’impact lu par les donateurs qui financent ces rencontres.',
    mobile: 'La Fondation M valide votre récit sans le modifier. Il rejoint ensuite le rapport d’impact lu par les donateurs.',
  },
}

const LIST_PATH: Record<FeedbackRole, { to: string; label: string }> = {
  school: { to: PATHS.schoolFeedbacks, label: "Retours d'expérience" },
  speaker: { to: PATHS.speakerImpact, label: 'Mon impact' },
}

const FIELD_ORDER: readonly FeedbackField[] = ['rating', 'present', 'girls', 'boys', 'age', 'stories', 'rawText', 'total']

function slotMinutes(context: FeedbackMeetingContext): number | null {
  const start = parseIso(context.startAt)
  const end = parseIso(context.endAt)
  return start && end ? Math.round((end.getTime() - start.getTime()) / MINUTE_MS) : null
}

function dateLine(iso: string | null): string | null {
  const start = parseIso(iso)
  return start ? `${formatCompactDay(start)} · ${formatTime(start)}` : null
}

function classLine(context: FeedbackMeetingContext): string {
  const count = context.studentCount === null ? null : `${context.studentCount} élèves`
  return [context.classTitle, count].filter(Boolean).join(' · ')
}

function MeetingAside({ role, context, others }: { role: FeedbackRole; context: FeedbackMeetingContext; others: readonly OtherFeedback[] }) {
  const date = dateLine(context.startAt)
  const why = WHY[role]
  return (
    <aside aria-label="La rencontre" className="hidden flex-col gap-4 lg:flex">
      <section className="flex flex-col gap-3 rounded-[20px] border-2 border-line bg-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-sans text-[15px] font-black">La rencontre</h2>
          <span className="rounded-pill bg-indigo px-2.5 py-1 text-xs font-black text-cream">Réalisée</span>
        </div>
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-orange font-display text-[17px] text-ink">
            {initialsOf(context.partnerName)}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="font-black">{context.partnerName}</span>
            {context.partnerDetail && <span className="text-[13px] font-bold text-muted">{context.partnerDetail}</span>}
          </span>
        </div>
        <dl className="grid grid-cols-[64px_1fr] gap-x-3 gap-y-1.5 text-sm">
          <dt className="font-bold text-muted">Date</dt>
          <dd className="font-black">{date ?? '—'}</dd>
          <dt className="font-bold text-muted">Classe</dt>
          <dd className="font-black">{classLine(context) || '—'}</dd>
          <dt className="font-bold text-muted">Lieu</dt>
          <dd className="font-black">{context.place ?? '—'}</dd>
        </dl>
      </section>
      <section className="flex flex-col gap-1.5 rounded-[20px] bg-cream p-4">
        <h2 className="font-sans text-[15px] font-black">{why.title}</h2>
        <p className="text-sm font-semibold">{why.pc}</p>
      </section>
      {others.length > 0 && (
        <section className="flex flex-col gap-2 rounded-[20px] border-2 border-line bg-surface p-4">
          <h2 className="font-sans text-[15px] font-black">Mes autres retours</h2>
          <ul className="flex flex-col">
            {others.map((other) => {
              const start = parseIso(other.startAt)
              return (
                <li key={other.meetingId}>
                  <Link
                    to={feedbackFormPath(role, other.meetingId)}
                    className="flex min-h-touch items-center justify-between gap-2 text-sm font-bold text-ink hover:underline"
                  >
                    <span>
                      {other.name}
                      {start && ` · ${DAY_MONTH_SHORT.format(start).replace('.', '')}`}
                    </span>
                    <StepBadge step={other.step} />
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </aside>
  )
}

/** Carte compacte de la rencontre, en tête du formulaire mobile (maquettes mobiles). */
function MobileMeetingCard({ context }: { context: FeedbackMeetingContext }) {
  const start = parseIso(context.startAt)
  const when = start ? `${formatCompactDay(start)} · ${start.getHours()}h` : null
  return (
    <div className="flex items-center gap-3 rounded-[18px] bg-surface p-3 lg:hidden">
      <span aria-hidden="true" className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-orange font-display text-[17px] text-ink">
        {initialsOf(context.partnerName)}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="font-black">{context.partnerName}</span>
        <span className="text-[13px] font-bold text-muted">{[context.classTitle, when].filter(Boolean).join(' · ')}</span>
      </span>
    </div>
  )
}

const SECTION = 'flex flex-col gap-4 rounded-[20px] border-2 border-line bg-surface p-4 lg:p-5'

/**
 * Formulaire de retour d'expérience (maquettes W1-E6 école, W2-E10 intervenant). Le retour est sérialisé dans
 * `comment` (décision 87) ; « Finir plus tard » garde un brouillon dans l'onglet (décision 91) ; un retour validé
 * se lit sans pouvoir être modifié (décision 90).
 */
export function FeedbackEditor({ role, userId, context, existing, others }: FeedbackEditorProps) {
  const navigate = useNavigate()
  const save = useSaveFeedback(role)
  const [restored] = useState(() => readDraft(userId, context.meetingId))
  const [values, setValues] = useState<FeedbackValues>(() => restored ?? initialValues(existing, slotMinutes(context)))
  const [baseline, setBaseline] = useState(values)
  const [showErrors, setShowErrors] = useState(false)
  const [saved, setSaved] = useState<MyFeedback | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [failure, setFailure] = useState<unknown>(null)
  const [leaving, setLeaving] = useState(false)
  const summaryRef = useRef<HTMLDivElement>(null)

  const status = saved?.status ?? existing?.status ?? null
  const step = stepOf(status)
  const readOnly = status === 'PUBLISHED'
  const dirty = !readOnly && JSON.stringify(values) !== JSON.stringify(baseline)
  const blocker = useLeaveGuard(dirty && !leaving)
  const check = checkFeedback(role, values, context.studentCount)
  const errors = showErrors ? check.errors : {}
  const listPath = LIST_PATH[role]

  useEffect(() => {
    if (leaving) void navigate(listPath.to)
  }, [leaving, navigate, listPath.to])

  useEffect(() => {
    if (readOnly) clearDraft(userId, context.meetingId)
  }, [readOnly, userId, context.meetingId])

  function update(patch: Partial<FeedbackValues>) {
    setValues((current) => ({ ...current, ...patch }))
  }

  function submit() {
    setNotice(null)
    setFailure(null)
    if (Object.keys(check.errors).length > 0) {
      setShowErrors(true)
      // Le résumé des erreurs reçoit le focus après son rendu.
      requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }
    const wasSubmitted = status === 'SUBMITTED'
    const sentValues = values
    save.mutate(
      { meetingId: context.meetingId, existing: wasSubmitted, comment: check.comment, rating: check.rating },
      {
        onSuccess: (feedback) => {
          clearDraft(userId, context.meetingId)
          setBaseline(sentValues)
          setSaved(feedback)
          setShowErrors(false)
          setNotice(
            wasSubmitted
              ? 'Votre retour est mis à jour.'
              : 'Merci ! Votre retour est partagé avec la Fondation M. Vous pouvez encore le modifier tant qu’il n’est pas validé.',
          )
        },
        onError: (error) => setFailure(error),
      },
    )
  }

  function later() {
    saveDraft(userId, context.meetingId, values)
    setLeaving(true)
  }

  const emotions = role === 'school' ? SCHOOL_EMOTIONS : SPEAKER_EMOTIONS
  const why = WHY[role]
  const fieldErrors = failure === null ? [] : errorFromException(failure).fieldErrors
  const errorList = FIELD_ORDER.flatMap((field) => (errors[field] ? [errors[field]] : []))
  const summary = classSummary(values, context.studentCount)

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <nav aria-label="Fil d'Ariane" className="hidden text-sm font-bold text-muted lg:block">
        <Link to={listPath.to} className="text-indigo underline underline-offset-2">
          {listPath.label}
        </Link>{' '}
        / Retour d'expérience · {context.partnerName}
      </nav>
      <PageTitle title={pageTitle(role, context)} mobileKicker="Retour d'expérience" subtitle={SUBTITLE[role].pc} mobileSubtitle={SUBTITLE[role].mobile} />
      <FeedbackStepper step={step} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="flex flex-col gap-4">
          <MobileMeetingCard context={context} />
          <div aria-live="polite" className="flex flex-col gap-2 empty:hidden">
            {notice && <p className="rounded-block border-l-[6px] border-green bg-green-tint px-4 py-3 text-sm font-semibold text-green">{notice}</p>}
          </div>
          {restored && !readOnly && !notice && (
            <p className="rounded-block bg-cream px-4 py-3 text-sm font-semibold text-ink">Brouillon repris : il est gardé sur cet appareil, dans cet onglet.</p>
          )}

          {failure !== null && (
            <Alert tone="error">
              {errorMessage(failure)}
              {fieldErrors.length > 0 && (
                <ul className="list-disc pl-5">
                  {fieldErrors.map((fieldError) => (
                    <li key={`${fieldError.field}-${fieldError.message}`}>{fieldError.message}</li>
                  ))}
                </ul>
              )}
            </Alert>
          )}
          {readOnly ? (
            <>
              <Alert tone="success" title="Retour validé">
                La Fondation M l’a validé : il fait partie du rapport d’impact des donateurs et ne peut plus être modifié.
              </Alert>
              <section aria-label="Votre retour" className={SECTION}>
                <FeedbackContent comment={saved?.comment ?? existing?.comment ?? null} rating={saved?.rating ?? existing?.rating ?? null} />
              </section>
            </>
          ) : (
            <form
              noValidate
              className="flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault()
                submit()
              }}
            >
              {errorList.length > 0 && (
                <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded-block border-l-[6px] border-red bg-red-tint px-4 py-3 text-sm font-semibold text-red outline-none">
                  <p className="font-black">Certains champs sont à corriger :</p>
                  <ul className="list-disc pl-5">
                    {errorList.map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {role === 'school' && values.rawText === null && (
                <fieldset className={SECTION}>
                  <legend className="mb-1 font-display text-xl">La classe que vous avez réunie</legend>
                  <div className="grid grid-cols-3 gap-3 lg:grid-cols-5">
                    <FormField label="Élèves présents" required error={errors.present}>
                      {(control) => <Input {...control} inputMode="numeric" value={values.present} onChange={(event) => update({ present: event.target.value })} />}
                    </FormField>
                    <FormField label="Filles" error={errors.girls}>
                      {(control) => <Input {...control} inputMode="numeric" value={values.girls} onChange={(event) => update({ girls: event.target.value })} />}
                    </FormField>
                    <FormField label="Garçons" error={errors.boys}>
                      {(control) => <Input {...control} inputMode="numeric" value={values.boys} onChange={(event) => update({ boys: event.target.value })} />}
                    </FormField>
                    <FormField label="Âge moyen (ans)" error={errors.age}>
                      {(control) => <Input {...control} inputMode="numeric" value={values.age} onChange={(event) => update({ age: event.target.value })} />}
                    </FormField>
                    <FormField label="Durée">
                      {(control) => (
                        <Select {...control} value={values.duration} onChange={(event) => update({ duration: event.target.value })}>
                          <option value="">Non précisée</option>
                          {DURATION_OPTIONS.map((minutes) => (
                            <option key={minutes} value={String(minutes)}>
                              {durationLabel(minutes)}
                            </option>
                          ))}
                        </Select>
                      )}
                    </FormField>
                  </div>
                  <p aria-live="polite" className="text-sm font-bold text-muted empty:hidden">
                    {summary}
                  </p>
                </fieldset>
              )}

              {(role === 'speaker' || values.rawText === null) && (
                <section aria-label="Votre ressenti" className={SECTION}>
                  {role === 'speaker' && <RatingPicker value={values.rating} onChange={(rating) => update({ rating })} error={errors.rating} />}
                  {role === 'speaker' && values.rawText === null && (
                    <ChipGroup label="Les élèves étaient…" options={PUPIL_OPTIONS} value={values.pupils} onChange={(pupils) => update({ pupils })} tone="indigo" />
                  )}
                  {values.rawText === null && (
                    <ChipGroup
                      label="Qu'avez-vous ressenti ?"
                      hint={role === 'school' ? 'Choisissez autant d’émotions que vous voulez.' : 'Pendant ou après la rencontre. Autant d’émotions que vous voulez.'}
                      options={emotions}
                      value={values.emotions}
                      onChange={(chosen) => update({ emotions: chosen })}
                      tone="terra"
                    />
                  )}
                </section>
              )}

              <section aria-labelledby="recits-titre" className={SECTION}>
                <h2 id="recits-titre" className="text-xl">
                  Ce que vous avez vécu
                </h2>
                {values.rawText === null ? (
                  storyFields(role).map((field) => (
                    <FormField key={field.key} label={field.label} hint={field.hint} hintTone="muted">
                      {(control) => (
                        <>
                          <Textarea
                            {...control}
                            aria-invalid={Boolean(errors.stories)}
                            rows={3}
                            className="h-auto py-3"
                            maxLength={STORY_MAX}
                            value={values.stories[field.key]}
                            onChange={(event) => update({ stories: { ...values.stories, [field.key]: event.target.value } })}
                          />
                          <span className="self-end text-xs font-bold text-muted">
                            {values.stories[field.key].length} / {STORY_MAX}
                            {' '}
                            <span className="sr-only">caractères</span>
                          </span>
                        </>
                      )}
                    </FormField>
                  ))
                ) : (
                  <FormField
                    label="Votre récit"
                    hint="Ce retour a été écrit sans les rubriques du formulaire : il se modifie d’un seul tenant."
                    hintTone="muted"
                    error={errors.rawText}
                  >
                    {(control) => (
                      <Textarea {...control} rows={8} className="h-auto py-3" maxLength={COMMENT_MAX} value={values.rawText ?? ''} onChange={(event) => update({ rawText: event.target.value })} />
                    )}
                  </FormField>
                )}
                {errors.stories && <p className="text-xs font-bold text-red">{errors.stories}</p>}
                <p className="rounded-[12px] bg-canvas px-3 py-2 text-[13px] font-bold text-ink">{PRIVACY_NOTE}</p>
                <p className={cn('text-xs font-bold', check.comment.length > COMMENT_MAX ? 'text-red' : 'text-muted')}>
                  {check.comment.length} / {COMMENT_MAX} caractères au total
                </p>
              </section>

              <p className="text-sm font-semibold text-ink lg:hidden">{why.mobile}</p>

              <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                <Button type="submit" loading={save.isPending}>
                  {status === 'SUBMITTED' ? 'Mettre à jour mon retour' : 'Partager mon retour'}
                </Button>
                <Button type="button" variant="outline" onClick={later} disabled={save.isPending}>
                  Finir plus tard
                </Button>
              </div>
              <p className="text-xs font-bold text-muted">« Finir plus tard » garde un brouillon sur cet appareil, dans cet onglet.</p>
            </form>
          )}
        </div>
        <MeetingAside role={role} context={context} others={others} />
      </div>

      <LeaveGuardModal
        blocker={blocker}
        title="Quitter sans partager ?"
        stayLabel="Rester sur la page"
        message="Votre récit n’est pas encore enregistré. « Finir plus tard » le garde en brouillon sur cet appareil."
      />
    </div>
  )
}
