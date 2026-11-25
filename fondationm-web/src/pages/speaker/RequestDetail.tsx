import { useState } from 'react'
import { errorMessage } from '../../api/errors'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ReasonForm, type ReasonValues } from '../../components/ui/ReasonForm'
import { formatDate } from '../../lib/formatDate'
import { applyServerFieldErrors } from '../../lib/serverFieldErrors'
import { RequestResult } from './RequestResult'
import { awaitsMyAnswer, errorCode, isConflict, useAcceptMeeting, useRefuseMeeting, type Meeting } from './speakerData'
import { MEETING_FORMAT_LABEL, pendingOnSameSlot, requestBadge, slotText } from './speakerText'

const REFUSE_REASON_MAX = 500

interface RequestDetailProps {
  meeting: Meeting
  all: readonly Meeting[]
  inMyZone: boolean
  onProcessed: (meeting: Meeting) => void
  /** 409 : demande déjà traitée ou créneau passé (code du serveur). */
  onConflict: (code: string) => void
}

export function RequestDetail({ meeting, all, inMyZone, onProcessed, onConflict }: RequestDetailProps) {
  const [refusing, setRefusing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const accept = useAcceptMeeting()
  const refuse = useRefuseMeeting()
  const badge = requestBadge(meeting)
  const sent = formatDate(meeting.createdAt)
  const busy = accept.isPending || refuse.isPending
  const sameSlot = pendingOnSameSlot(meeting, all)
  const facts = [
    { label: 'Créneau demandé', value: slotText(meeting) },
    { label: 'Format souhaité', value: meeting.format ? MEETING_FORMAT_LABEL[meeting.format] : null },
    { label: 'Lieu', value: meeting.place },
    { label: 'Classe', value: meeting.classTitle || null },
    {
      label: "Nombre d'élèves",
      value: meeting.studentCount === null ? null : String(meeting.studentCount),
    },
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact.value))

  function conflict(error: unknown): boolean {
    if (!isConflict(error)) return false
    onConflict(errorCode(error))
    return true
  }

  function handleAccept() {
    setActionError(null)
    accept.mutate(meeting.id, {
      onSuccess: (result) => onProcessed(result ?? { ...meeting, myDecision: 'VALIDATED' }),
      onError: (error) => {
        if (!conflict(error)) setActionError(errorMessage(error))
      },
    })
  }

  function handleRefuse(values: ReasonValues, setServerError: (message: string) => void) {
    setActionError(null)
    refuse.mutate(
      { id: meeting.id, reason: values.reason },
      {
        onSuccess: (result) =>
          onProcessed(
            result ?? { ...meeting, status: 'REFUSED', myDecision: 'REFUSED', closedBy: 'SPEAKER', reason: values.reason },
          ),
        onError: (error) => {
          if (conflict(error)) return
          const placed = applyServerFieldErrors<ReasonValues>(
            error,
            (_name, { message }) => setServerError(message ?? ''),
            { fields: ['reason'] },
          )
          if (!placed) setActionError(errorMessage(error))
        },
      },
    )
  }

  return (
    <article aria-labelledby={`demande-${meeting.id}`} className="flex flex-col gap-5 rounded-card bg-surface p-5 shadow-card lg:p-7">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-extrabold text-muted">{sent ? `Demande envoyée le ${sent}` : 'Demande reçue'}</p>
        <Badge tone={badge.tone}>{badge.label}</Badge>
      </header>

      <div className="flex flex-col gap-1">
        <h2 id={`demande-${meeting.id}`} className="text-2xl leading-tight text-ink md:text-[28px]">
          {meeting.schoolName}
        </h2>
        <p className="flex flex-wrap items-center gap-2 font-semibold text-muted">
          {[meeting.schoolCity, meeting.schoolCountry].filter(Boolean).join(', ')}
          {inMyZone && <Badge tone="success">Dans votre zone</Badge>}
        </p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2">
        {facts.map((fact) => (
          <div key={fact.label} className="flex flex-col">
            <dt className="text-xs font-black uppercase tracking-[0.08em] text-muted">{fact.label}</dt>
            <dd className="font-bold text-ink">{fact.value}</dd>
          </div>
        ))}
      </dl>

      {meeting.message && (
        <section aria-labelledby={`mot-${meeting.id}`} className="flex flex-col gap-2">
          <h3 id={`mot-${meeting.id}`} className="text-lg">
            Le mot de l'école
          </h3>
          <blockquote className="whitespace-pre-line rounded-block border-l-[6px] border-orange bg-canvas px-4 py-3 font-semibold italic text-ink">
            {meeting.message}
          </blockquote>
        </section>
      )}

      {meeting.status === 'PENDING' && sameSlot > 1 && (
        <Alert tone="info">
          Une autre école demande aussi ce créneau. Vous pouvez accepter les deux : dès qu'une rencontre est
          confirmée par la Fondation M, l'autre demande est refusée automatiquement (« créneau pris »).
        </Alert>
      )}

      {actionError && <Alert tone="error">{actionError}</Alert>}

      {awaitsMyAnswer(meeting) ? (
        refusing ? (
          <ReasonForm
            formLabel="Refuser la demande"
            fieldLabel="Un mot pour expliquer ?"
            maxLength={REFUSE_REASON_MAX}
            requiredMessage="Expliquez en quelques mots pourquoi vous refusez."
            submitLabel="Confirmer le refus"
            submitting={refuse.isPending}
            onSubmit={handleRefuse}
            onCancel={() => setRefusing(false)}
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button variant="success" size="md" loading={accept.isPending} disabled={busy} onClick={handleAccept}>
              Accepter
            </Button>
            <Button variant="outline" size="md" disabled={busy} onClick={() => setRefusing(true)}>
              Refuser
            </Button>
          </div>
        )
      ) : (
        <RequestResult meeting={meeting} />
      )}
    </article>
  )
}
