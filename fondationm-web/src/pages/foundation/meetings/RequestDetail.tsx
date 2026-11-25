import { useState } from 'react'
import { Link } from 'react-router'
import { errorFromException } from '../../../api/errors'
import { PATHS } from '../../../auth/roles'
import { Alert } from '../../../components/ui/Alert'
import { ReasonForm } from '../../../components/ui/ReasonForm'
import { cn } from '../../../lib/cn'
import type { FoundationMeeting } from './foundationMeetingsData'
import { useMeetingAction } from './foundationMeetingsData'
import {
  actionErrorMessage,
  classLine,
  decisionLook,
  isAwaitingFoundation,
  plural,
  requestBadge,
  requestOutcome,
  sentOn,
  slotConflicts,
  slotLong,
  speakerLine,
  type Outcome,
} from './foundationMeetingState'

const OUTCOME_TONE: Record<Outcome['tone'], { box: string; title: string }> = {
  success: { box: 'bg-[#E8EEDF]', title: 'text-[#3B5221]' },
  danger: { box: 'bg-[#FBE3E3]', title: 'text-[#8E1518]' },
  neutral: { box: 'bg-canvas', title: 'text-ink' },
}

/** Bloc de résultat (maquette W3-demandes) ; `heading` : rappel de la demande au-dessus de la suivante. */
export function OutcomeBlock({ meeting, heading = false }: { meeting: FoundationMeeting; heading?: boolean }) {
  const outcome = requestOutcome(meeting)
  if (outcome === null) return null
  const tone = OUTCOME_TONE[outcome.tone]
  return (
    <div role={heading ? 'status' : undefined} aria-label={heading ? 'Demande traitée' : undefined} className={cn('flex flex-col gap-1 rounded-[14px] px-3.5 py-3 lg:px-4 lg:py-3.5', tone.box)}>
      {heading && (
        <span className="text-xs font-black uppercase tracking-[0.06em] text-muted">
          {meeting.schoolName} → {meeting.speakerName}
        </span>
      )}
      <span className={cn('text-[15px] font-black', tone.title)}>{outcome.title}</span>
      <span className="text-[13px] font-semibold leading-[1.45] text-ink lg:text-sm">{outcome.text}</span>
      {outcome.toCalendar && (
        <Link
          to={`${PATHS.foundationMeetings}?rencontre=${encodeURIComponent(meeting.id)}`}
          className="inline-flex min-h-touch items-center self-start text-[13px] font-black text-indigo underline underline-offset-2 lg:text-sm"
        >
          <span className="lg:hidden">Voir dans le calendrier</span>
          <span className="hidden lg:inline">Voir dans le calendrier des rencontres</span>
        </Link>
      )}
    </div>
  )
}

interface RequestDetailProps {
  meeting: FoundationMeeting
  all: readonly FoundationMeeting[]
  onProcessed: (updated: FoundationMeeting) => void
  /** Fixe la demande dans l'URL avant une action : le détail reste monté pendant le rechargement. */
  onPin: () => void
}

/** Détail d'une demande (maquette W3-demandes) : cases, avis, conflit de créneau, actions ou résultat. */
export function RequestDetail({ meeting, all, onProcessed, onPin }: RequestDetailProps) {
  const action = useMeetingAction()
  const [refusing, setRefusing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const badge = requestBadge(meeting)
  const speaker = decisionLook(meeting.speakerDecision)
  const foundation = decisionLook(meeting.foundationDecision)
  const conflicts = meeting.status === 'PENDING' ? slotConflicts(meeting, all) : []
  const canDecide = isAwaitingFoundation(meeting)
  const sent = sentOn(meeting)

  function validate() {
    setError(null)
    onPin()
    action.mutate(
      { kind: 'validate', id: meeting.id },
      { onSuccess: onProcessed, onError: (failure) => setError(actionErrorMessage(failure)) },
    )
  }

  return (
    <article
      aria-labelledby={`demande-${meeting.id}`}
      className="flex flex-col gap-3 rounded-[22px] bg-surface p-[18px] lg:gap-4 lg:rounded-[24px] lg:p-6"
    >
      <h2 id={`demande-${meeting.id}`} className="sr-only">
        Demande de {meeting.schoolName} pour {meeting.speakerName}
      </h2>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold text-muted lg:text-[13px]">{sent ? `Envoyée le ${sent}` : 'Date d’envoi inconnue'}</span>
        <span className={cn('rounded-pill px-[9px] py-1 text-[11px] font-black lg:px-2.5 lg:text-xs', badge.className)}>{badge.label}</span>
      </div>

      <div className="grid gap-2.5 lg:grid-cols-2 lg:gap-3">
        <div className="flex flex-col gap-0.5 rounded-[14px] bg-[#DCE3EF] p-3 lg:rounded-2xl lg:p-3.5">
          <span className="text-[10px] font-black uppercase text-indigo lg:text-[11px]">École</span>
          <span className="font-display text-[19px] leading-[1.1] lg:text-xl">{meeting.schoolName}</span>
          <span className="text-xs font-bold lg:text-[13px]">
            {meeting.schoolCity}
            <span className="lg:hidden">{classLine(meeting) && ` · ${classLine(meeting)}`}</span>
          </span>
        </div>
        <div className="flex flex-col gap-0.5 rounded-[14px] bg-[#FDEBD3] p-3 lg:rounded-2xl lg:p-3.5">
          <span className="text-[10px] font-black uppercase text-[#7A4100] lg:text-[11px]">Intervenant</span>
          <span className="font-display text-[19px] leading-[1.1] lg:text-xl">{meeting.speakerName}</span>
          {speakerLine(meeting) && <span className="text-xs font-bold lg:text-[13px]">{speakerLine(meeting)}</span>}
        </div>
      </div>

      <span className="text-sm font-black lg:hidden">{slotLong(meeting)}</span>
      <dl className="hidden grid-cols-2 gap-2.5 lg:grid">
        <div className="rounded-[14px] bg-canvas px-3.5 py-3">
          <dt className="text-[11px] font-black uppercase text-muted">Créneau</dt>
          <dd className="font-black">{slotLong(meeting)}</dd>
        </div>
        <div className="rounded-[14px] bg-canvas px-3.5 py-3">
          <dt className="text-[11px] font-black uppercase text-muted">Classe</dt>
          <dd className="font-black">{classLine(meeting) || '—'}</dd>
        </div>
      </dl>

      {meeting.message && (
        <blockquote className="rounded-[12px] bg-cream p-3 text-sm font-semibold leading-normal lg:rounded-[14px] lg:px-4 lg:py-3.5 lg:text-[15px]">
          « {meeting.message} »
          <span className="mt-1 hidden text-xs font-black lg:block">Le mot de l'école</span>
        </blockquote>
      )}

      <div className="grid grid-cols-2 gap-2 lg:gap-2.5">
        <div className={cn('flex flex-col rounded-[12px] p-2.5 lg:rounded-[14px] lg:px-3.5 lg:py-3', speaker.box)}>
          <span className={cn('text-[10px] font-black uppercase lg:text-[11px]', speaker.text)}>
            <span className="lg:hidden">Intervenant</span>
            <span className="hidden lg:inline">Avis de l'intervenant</span>
          </span>
          <span className={cn('font-black lg:text-[15px]', speaker.text)}>{speaker.label}</span>
        </div>
        <div className={cn('flex flex-col rounded-[12px] p-2.5 lg:rounded-[14px] lg:px-3.5 lg:py-3', foundation.box)}>
          <span className={cn('text-[10px] font-black uppercase lg:text-[11px]', foundation.text)}>Votre avis</span>
          <span className={cn('font-black lg:text-[15px]', foundation.text)}>{foundation.label}</span>
        </div>
      </div>

      {conflicts.length > 0 && (
        <p className="rounded-[12px] border-2 border-orange bg-[#FDEBD3] px-3 py-2.5 text-[13px] font-bold leading-[1.4] lg:px-3.5 lg:py-3 lg:text-sm lg:leading-[1.45]">
          {plural(conflicts.length, 'autre demande', 'autres demandes')} sur ce créneau (
          {conflicts.map((other) => other.schoolName).join(', ')}). Si cette rencontre est confirmée,{' '}
          {conflicts.length > 1 ? 'elles seront refusées' : 'elle sera refusée'} automatiquement.
        </p>
      )}

      {error && <Alert tone="error">{error}</Alert>}

      {canDecide &&
        (refusing ? (
          <ReasonForm
            formLabel="Refuser la demande"
            fieldLabel="Motif du refus"
            fieldNote="(facultatif, transmis à l'école et à l'intervenant)"
            placeholder="Ex. : cette classe a déjà rencontré un intervenant du même secteur ce mois-ci."
            maxLength={500}
            submitLabel="Confirmer le refus"
            submitting={action.isPending}
            onCancel={() => setRefusing(false)}
            onSubmit={({ reason }, setServerError) => {
              setError(null)
              onPin()
              action.mutate(
                { kind: 'refuse', id: meeting.id, reason: reason.trim() },
                {
                  onSuccess: onProcessed,
                  onError: (failure) => {
                    const field = errorFromException(failure).fieldErrors.find((entry) => entry.field === 'reason')
                    if (field) setServerError(field.message)
                    else setError(actionErrorMessage(failure))
                  },
                },
              )
            }}
          />
        ) : (
          <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:gap-2.5">
            <button
              type="button"
              onClick={validate}
              disabled={action.isPending}
              aria-busy={action.isPending || undefined}
              className="inline-flex min-h-[54px] items-center justify-center rounded-button bg-green font-display text-[19px] text-white disabled:opacity-60 lg:flex-[2_1_200px]"
            >
              Valider la demande
            </button>
            <button
              type="button"
              onClick={() => setRefusing(true)}
              disabled={action.isPending}
              className="inline-flex min-h-[50px] items-center justify-center rounded-button border-2 border-ink bg-surface text-[15px] font-black text-ink lg:min-h-[54px] lg:flex-[1_1_140px]"
            >
              Refuser
            </button>
          </div>
        ))}

      {!canDecide && <OutcomeBlock meeting={meeting} />}
    </article>
  )
}
