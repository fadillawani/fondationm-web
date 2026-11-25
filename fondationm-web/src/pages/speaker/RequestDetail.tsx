import { useState } from 'react'
import { errorMessage } from '../../api/errors'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ReasonForm, type ReasonValues } from '../../components/ui/ReasonForm'
import { formatDayMonth, parseIso } from '../../lib/dateTime'
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
  const created = parseIso(meeting.createdAt)
  // Maquette : « 12 novembre » (sans l'année).
  const sent = created ? formatDayMonth(created) : null
  const busy = accept.isPending || refuse.isPending
  const sameSlot = pendingOnSameSlot(meeting, all)
  const facts = [
    { label: 'Créneau demandé', value: slotText(meeting) },
    { label: 'Format souhaité', value: meeting.format ? MEETING_FORMAT_LABEL[meeting.format] : null },
    { label: 'Classe', value: meeting.classTitle || null },
    // Maquette : « Filière · élèves » ; la filière est absente de ClassInfo.
    {
      label: 'Élèves',
      value: meeting.studentCount === null ? null : `${meeting.studentCount} élève${meeting.studentCount > 1 ? 's' : ''}`,
    },
    { label: 'Lieu', value: meeting.place },
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
    <article
      aria-labelledby={`demande-${meeting.id}`}
      className="flex flex-col gap-4 rounded-[22px] bg-surface p-[18px] lg:gap-5 lg:rounded-[24px] lg:p-6"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold text-muted lg:text-[13px]">
          <span className="hidden lg:inline">{sent ? `Demande envoyée le ${sent}` : 'Demande reçue'}</span>
          <span className="lg:hidden">{sent ? `Envoyée le ${sent}` : 'Demande reçue'}</span>
        </p>
        <Badge tone={badge.tone} size="md">
          {badge.label}
        </Badge>
      </header>

      <div className="flex flex-col gap-1">
        <h2 id={`demande-${meeting.id}`} className="text-[25px] leading-tight text-ink lg:text-[28px]">
          {meeting.schoolName}
        </h2>
        <p className="flex flex-wrap items-center gap-2 text-sm font-extrabold text-muted">
          {meeting.schoolCity}
          {inMyZone && (
            <span className="rounded-pill bg-[#DCE3EF] px-[9px] py-[3px] text-[11px] font-black text-indigo">Dans votre zone</span>
          )}
        </p>
      </div>

      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:gap-2.5">
        {facts.map((fact) => (
          <div key={fact.label} className="flex flex-col rounded-[12px] bg-canvas px-3 py-2.5 lg:rounded-[14px] lg:px-3.5 lg:py-3">
            <dt className="text-[11px] font-black uppercase text-muted">{fact.label}</dt>
            <dd className="font-black text-ink lg:text-[15px]">{fact.value}</dd>
          </div>
        ))}
      </dl>

      {meeting.message && (
        <section aria-labelledby={`mot-${meeting.id}`} className="flex flex-col gap-1.5">
          <h3 id={`mot-${meeting.id}`} className="font-sans text-[13px] font-black">
            Le mot de l'école
          </h3>
          <blockquote className="whitespace-pre-line rounded-[12px] bg-cream px-3.5 py-3 text-sm font-semibold text-ink lg:rounded-[14px] lg:px-4 lg:py-3.5 lg:text-[15px]">
            « {meeting.message} »
          </blockquote>
        </section>
      )}

      {meeting.status === 'PENDING' && sameSlot > 1 && (
        <p className="rounded-[12px] border-2 border-orange bg-[#FDEBD3] px-3.5 py-3 text-[13px] font-bold text-ink lg:text-sm">
          <span className="hidden lg:inline">
            Une autre école demande aussi ce créneau. Vous pouvez accepter les deux : dès qu'une rencontre est
            confirmée par la Fondation M, l'autre demande est refusée automatiquement (« créneau pris »).
          </span>
          <span className="lg:hidden">
            Une autre école demande ce créneau. Dès qu'une rencontre est confirmée, l'autre demande est refusée
            automatiquement (« créneau pris »).
          </span>
        </p>
      )}

      {actionError && <Alert tone="error">{actionError}</Alert>}

      {awaitsMyAnswer(meeting) ? (
        refusing ? (
          <ReasonForm
            formLabel="Refuser la demande"
            fieldLabel="Un mot pour expliquer ?"
            fieldNote="(transmis par la Fondation M)"
            placeholder="Ex. : je suis en déplacement ce jour-là, mais disponible la semaine suivante."
            maxLength={REFUSE_REASON_MAX}
            requiredMessage="Expliquez en quelques mots pourquoi vous refusez."
            submitLabel="Confirmer le refus"
            submitting={refuse.isPending}
            onSubmit={handleRefuse}
            onCancel={() => setRefusing(false)}
          />
        ) : (
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <Button variant="primary" loading={accept.isPending} disabled={busy} onClick={handleAccept} className="min-h-[54px] flex-1 text-[19px]">
              Accepter
            </Button>
            <Button
              variant="outlineInk"
              disabled={busy}
              onClick={() => setRefusing(true)}
              className="min-h-[50px] font-sans text-[15px] font-black lg:min-h-[54px]"
            >
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
