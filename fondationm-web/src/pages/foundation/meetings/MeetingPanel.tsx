import { useState } from 'react'
import { Initials } from '../../../components/ui/Initials'
import { Link } from 'react-router'
import { errorFromException } from '../../../api/errors'
import { PATHS, foundationFeedbackPath } from '../../../auth/roles'
import { Alert } from '../../../components/ui/Alert'
import { ReasonForm } from '../../../components/ui/ReasonForm'
import { cn } from '../../../lib/cn'
import { parseIso } from '../../../lib/dateTime'
import { clock, placeLabel } from '../../school/meetingText'
import { useMeetingAction, useMeetingFeedbacks, type FoundationMeeting } from './foundationMeetingsData'
import { FEEDBACK_LOOK, actionErrorMessage, isToMark, meetingLook, panelNote, plural } from './foundationMeetingState'

const WEEKDAY_DAY_MONTH = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

interface MeetingPanelProps {
  meeting: FoundationMeeting
  /** Autres demandes PENDING du même créneau (pastille « 2 demandes × … »). */
  group: readonly FoundationMeeting[]
  now: Date
  /** Fixe la rencontre dans l'URL avant une action : le panneau reste monté pendant le rechargement. */
  onPin: () => void
}

function FeedbackCases({ meetingId }: { meetingId: string }) {
  const feedbacks = useMeetingFeedbacks(meetingId)
  const cell = (label: string, value: keyof NonNullable<typeof feedbacks.data>) => (
    <div className="flex flex-col gap-1 rounded-[12px] bg-canvas p-2.5">
      <span className="text-[11px] font-black uppercase text-muted">{label}</span>
      {feedbacks.isPending ? (
        <span className="text-xs font-bold text-muted">Chargement…</span>
      ) : feedbacks.isError ? (
        <span className="text-xs font-bold text-muted">Retours indisponibles</span>
      ) : (
        <span className={cn('self-start rounded-pill px-[9px] py-[3px] text-xs font-black', FEEDBACK_LOOK[feedbacks.data[value]])}>
          {feedbacks.data[value]}
        </span>
      )}
    </div>
  )
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        {cell('Retour école', 'school')}
        {cell('Retour intervenant', 'speaker')}
      </div>
      {feedbacks.isError && (
        <button
          type="button"
          onClick={() => void feedbacks.refetch()}
          className="inline-flex min-h-touch items-center self-start text-sm font-black text-indigo underline underline-offset-2"
        >
          Réessayer
        </button>
      )}
      <Link to={foundationFeedbackPath(meetingId)} className="inline-flex min-h-touch items-center self-start text-sm font-black text-indigo underline underline-offset-2">
        Voir les retours d'expérience
      </Link>
    </div>
  )
}

/** Panneau de détail des rencontres (maquette W3-rencontres) : bordure de l'état, notes, actions. */
export function MeetingPanel({ meeting: listed, group, now, onPin }: MeetingPanelProps) {
  const action = useMeetingAction()
  // La rencontre renvoyée par l'action prime sur la liste tant que celle-ci se recharge.
  const meeting = action.data?.id === listed.id ? action.data : listed
  const justCompleted = action.isSuccess && action.variables.kind === 'complete'
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const look = meetingLook(meeting, now)
  const start = parseIso(meeting.startAt)
  const end = parseIso(meeting.endAt)
  const note = panelNote(meeting, now, justCompleted)
  const several = group.length > 1
  const date = start ? WEEKDAY_DAY_MONTH.format(start) : ''
  const school = several
    ? group.map((entry) => entry.schoolName).join(' · ')
    : meeting.schoolCity
      ? `${meeting.schoolName} (${meeting.schoolCity})`
      : meeting.schoolName
  const classe = several
    ? group.map((entry) => (entry.studentCount === null ? entry.classTitle : `${entry.classTitle} (${entry.studentCount})`)).join(' ou ')
    : [meeting.classTitle, meeting.studentCount === null ? null : plural(meeting.studentCount, 'élève', 'élèves')].filter(Boolean).join(' · ')
  const place = several ? "Selon l'école retenue" : placeLabel(meeting)
  const time = start ? (end ? `${clock(start)} – ${clock(end)}` : clock(start)) : ''

  function complete() {
    setError(null)
    onPin()
    action.mutate({ kind: 'complete', id: meeting.id }, { onError: (failure) => setError(actionErrorMessage(failure)) })
  }

  return (
    <aside
      aria-label="Détail de la rencontre"
      aria-live="polite"
      className={cn('flex flex-col gap-3 rounded-[22px] border-2 bg-surface p-4 lg:gap-3.5 lg:rounded-[24px] lg:p-[22px]', look.accent)}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-black uppercase tracking-[0.08em] text-muted lg:text-xs lg:tracking-[0.1em]">{date}</span>
        <span
          className={cn(
            'rounded-pill px-[9px] py-1 text-[11px] font-black lg:px-2.5 lg:text-xs',
            look.label === 'À marquer' ? 'bg-red text-white' : look.chip.replace('line-through', ''),
          )}
        >
          {look.label}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Initials name={meeting.schoolName} tone="school" photoUrl={meeting.schoolPhotoUrl} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-xl leading-[1.1] lg:text-[23px]">{school}</h2>
          <span className="text-[13px] font-extrabold text-muted lg:text-sm">avec {meeting.speakerName}</span>
        </div>
      </div>
      <span className="text-[13px] font-extrabold lg:hidden">{[time, classe].filter(Boolean).join(' · ')}</span>
      <dl className="hidden grid-cols-[64px_1fr] gap-x-3 gap-y-1.5 text-sm lg:grid">
        <dt className="font-bold text-muted">Heure</dt>
        <dd className="font-black">{time || '—'}</dd>
        <dt className="font-bold text-muted">Classe</dt>
        <dd className="font-black">{classe || '—'}</dd>
        <dt className="font-bold text-muted">Lieu</dt>
        <dd className="font-black">{place ?? '—'}</dd>
      </dl>

      {note && (
        <p
          role={note.tone === 'success' ? 'status' : undefined}
          className={cn(
            'rounded-[12px] px-3 py-2.5 text-[13px] font-bold leading-[1.45] lg:rounded-[14px] lg:px-3.5 lg:py-3 lg:text-sm',
            note.tone === 'alert' ? 'bg-[#FBE3E3]' : note.tone === 'success' ? 'bg-[#E8EEDF]' : 'bg-canvas',
          )}
        >
          {note.text}
        </p>
      )}

      {meeting.status === 'COMPLETED' && <FeedbackCases meetingId={meeting.id} />}

      {error && <Alert tone="error">{error}</Alert>}

      {meeting.status === 'CONFIRMED' &&
        (cancelling ? (
          <ReasonForm
            formLabel="Annuler la rencontre"
            fieldLabel="Pourquoi l'annuler ?"
            fieldNote="(facultatif, transmis à l'école et à l'intervenant)"
            placeholder="Ex. : l'établissement a été fermé ce jour-là."
            maxLength={500}
            submitLabel="Confirmer l'annulation"
            cancelLabel="Retour"
            submitting={action.isPending}
            onCancel={() => setCancelling(false)}
            onSubmit={({ reason }, setServerError) => {
              setError(null)
              onPin()
              action.mutate(
                { kind: 'cancel', id: meeting.id, reason: reason.trim() },
                {
                  onSuccess: () => setCancelling(false),
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
          <div className="flex flex-col gap-2">
            {isToMark(meeting, now) && (
              <button
                type="button"
                onClick={complete}
                disabled={action.isPending}
                aria-busy={action.isPending || undefined}
                className="inline-flex min-h-[54px] items-center justify-center rounded-button bg-indigo font-display text-lg text-cream disabled:opacity-60 lg:text-[19px]"
              >
                Marquer « Réalisée »
              </button>
            )}
            <button
              type="button"
              onClick={() => setCancelling(true)}
              disabled={action.isPending}
              className="inline-flex min-h-12 items-center justify-center rounded-[14px] border-2 border-ink bg-surface text-sm font-black text-ink"
            >
              Marquer « Annulée »
            </button>
          </div>
        ))}

      {meeting.status === 'PENDING' && (
        <Link
          to={`${PATHS.foundationRequests}?demande=${encodeURIComponent(meeting.id)}`}
          className="inline-flex min-h-12 items-center justify-center rounded-[14px] bg-ink px-4 text-sm font-black text-cream"
        >
          Donner mon avis sur la demande
        </Link>
      )}
    </aside>
  )
}
