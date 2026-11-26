import { Initials } from '../../components/ui/Initials'
import { useState } from 'react'
import { Link } from 'react-router'
import { errorFromException, errorMessage } from '../../api/errors'
import { PATHS, feedbackFormPath } from '../../auth/roles'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { formatSlot, formatTimeRange } from '../../lib/dateTime'
import { STATE_LABEL, type AgendaItem } from './agendaModel'
import { useDeleteSlot, type Meeting } from './speakerData'
import { MEETING_FORMAT_LABEL, SLOT_FORMAT_DETAIL, classLine, closedByText, myAnswerLabel } from './speakerText'

const DELETE_CONFLICT: Partial<Record<string, string>> = {
  SLOT_HAS_PENDING_MEETINGS: 'Ce créneau a reçu une demande en attente : il ne peut plus être retiré.',
  SLOT_NOT_AVAILABLE: "Ce créneau n'est plus libre : il ne peut plus être retiré.",
}

function requestLink(meeting: Meeting): string {
  const tab = meeting.status === 'PENDING' && meeting.myDecision === 'PENDING' ? 'a-traiter' : 'toutes'
  return `${PATHS.speakerRequests}?onglet=${tab}&demande=${meeting.id}`
}

function FreeSlot({ item, onRemoved }: { item: AgendaItem; onRemoved: () => void }) {
  const remove = useDeleteSlot()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const slot = item.slot

  function confirm() {
    if (slot === null) return
    setError(null)
    remove.mutate(slot.id, {
      onSuccess: () => {
        setConfirming(false)
        onRemoved()
      },
      onError: (failure) => {
        setConfirming(false)
        const code = errorFromException(failure).code
        setError(DELETE_CONFLICT[code] ?? errorMessage(failure))
      },
    })
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        <h3 className="text-[21px] lg:text-[23px]">Créneau libre · {formatTimeRange(item.start, item.end)}</h3>
        {slot && <p className="text-[13px] font-bold text-muted lg:text-sm">{SLOT_FORMAT_DETAIL[slot.formats]}</p>}
      </div>
      <p className="text-sm font-semibold">Aucune demande pour l'instant. Les écoles de votre zone le voient en premier.</p>
      {error && <Alert tone="error">{error}</Alert>}
      {slot !== null && (
        <Button
          variant="outline"
          size="md"
          className="min-h-[46px] rounded-[14px] font-black"
          onClick={() => setConfirming(true)}
        >
          Retirer ce créneau
        </Button>
      )}
      <Modal
        open={confirming}
        title="Retirer ce créneau ?"
        onClose={() => setConfirming(false)}
        footer={
          <>
            <Button variant="outline" size="md" onClick={() => setConfirming(false)} disabled={remove.isPending}>
              Annuler
            </Button>
            <Button variant="danger" size="md" onClick={confirm} loading={remove.isPending}>
              Retirer
            </Button>
          </>
        }
      >
        <p className="font-semibold">
          Le créneau du {formatSlot(item.start, item.end)} ne sera plus visible par les écoles.
        </p>
      </Modal>
    </>
  )
}

function RequestedSlot({ item }: { item: AgendaItem }) {
  const pending = item.meetings.filter((meeting) => meeting.status === 'PENDING')
  const toAnswer = pending.filter((meeting) => meeting.myDecision === 'PENDING').length
  // Maquette : « 2 écoles demandent ce créneau », « Une école demande ce créneau », sinon accord donné.
  const headline =
    toAnswer > 1
      ? `${toAnswer} écoles demandent ce créneau`
      : toAnswer === 1
        ? 'Une école demande ce créneau'
        : 'Vous avez accepté, la Fondation M doit valider'
  const format = item.slot ? SLOT_FORMAT_DETAIL[item.slot.formats] : null
  return (
    <>
      <div className="flex flex-col gap-1">
        <h3 className="text-[21px] lg:text-[23px]">{headline}</h3>
        <p className="text-[13px] font-bold text-muted lg:text-sm">
          {[formatTimeRange(item.start, item.end), format].filter(Boolean).join(' · ')}
        </p>
      </div>
      <ul aria-label="Demandes sur ce créneau" className="flex flex-col gap-2">
        {pending.map((meeting) => (
          <li key={meeting.id} className="flex flex-col gap-1 rounded-[14px] bg-canvas px-3.5 py-3">
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[15px] font-black text-ink">{meeting.schoolName}</span>
              <span
                className={
                  meeting.myDecision === 'PENDING'
                    ? 'rounded-pill bg-yellow px-2 py-[3px] text-[11px] font-black text-ink'
                    : 'rounded-pill bg-green px-2 py-[3px] text-[11px] font-black text-white'
                }
              >
                {meeting.myDecision === 'PENDING' ? 'À traiter' : 'Acceptée'}
              </span>
            </span>
            <span className="text-xs font-bold text-muted lg:text-[13px]">
              {[meeting.schoolCity, meeting.classTitle].filter(Boolean).join(' · ')}
            </span>
            <span className="sr-only">{myAnswerLabel(meeting)}</span>
            <Link
              to={requestLink(meeting)}
              className="inline-flex min-h-touch items-center self-start text-[13px] font-black text-indigo underline"
            >
              Répondre{' '}
              <span className="sr-only">à {meeting.schoolName}</span>
            </Link>
          </li>
        ))}
      </ul>
      {pending.length > 1 && (
        <p className="text-[13px] font-bold text-[#7A4100]">
          Dès qu'une rencontre est confirmée sur ce créneau, l'autre demande est refusée automatiquement (« créneau
          pris »).
        </p>
      )}
    </>
  )
}

function MeetingDetail({ item, meeting }: { item: AgendaItem; meeting: Meeting }) {
  const closed = item.state === 'CLOSED'
  return (
    <>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <Initials name={meeting.schoolName} tone="school" photoUrl={meeting.schoolPhotoUrl} />
          <h3 className="text-[21px] lg:text-[23px]">{meeting.schoolName}</h3>
        </div>
        {classLine(meeting) && <p className="text-[13px] font-bold text-muted lg:text-sm">{classLine(meeting)}</p>}
      </div>
      <dl className="grid grid-cols-[64px_1fr] gap-x-3 gap-y-1.5 text-sm">
        <dt className="font-bold text-muted">Heure</dt>
        <dd className="font-black">{formatTimeRange(item.start, item.end)}</dd>
        <dt className="font-bold text-muted">Lieu</dt>
        <dd className="font-black">
          {[meeting.format ? MEETING_FORMAT_LABEL[meeting.format] : null, meeting.place].filter(Boolean).join(' · ') || '—'}
        </dd>
      </dl>
      {closed && (
        <div className="flex flex-col gap-1 rounded-[14px] bg-canvas px-3.5 py-3 text-sm font-semibold">
          {closedByText(meeting) && <span className="font-black">{closedByText(meeting)}</span>}
          {meeting.reason && <span>{meeting.reason}</span>}
        </div>
      )}
      {meeting.status === 'COMPLETED' && (
        <Link
          to={feedbackFormPath('speaker', meeting.id)}
          className="inline-flex min-h-[46px] items-center justify-center self-start rounded-[14px] bg-terra px-4 text-sm font-black text-white"
        >
          Mon retour d'expérience
        </Link>
      )}
      {meeting.message && (
        <section aria-label="Le mot de l'école" className="flex flex-col gap-1 rounded-[14px] bg-canvas px-3.5 py-3">
          <h4 className="font-sans text-[13px] font-black">Le mot de l'école</h4>
          <blockquote className="whitespace-pre-line text-sm font-semibold text-ink">« {meeting.message} »</blockquote>
        </section>
      )}
    </>
  )
}

interface AgendaItemDetailProps {
  item: AgendaItem
  onRemoved: () => void
}

export function AgendaItemDetail({ item, onRemoved }: AgendaItemDetailProps) {
  return (
    <article aria-label={`${STATE_LABEL[item.state]}, ${formatSlot(item.start, item.end)}`} className="flex flex-col gap-4">
      {item.state === 'FREE' && <FreeSlot item={item} onRemoved={onRemoved} />}
      {item.state === 'REQUESTED' && <RequestedSlot item={item} />}
      {item.main !== null && <MeetingDetail item={item} meeting={item.main} />}
    </article>
  )
}
