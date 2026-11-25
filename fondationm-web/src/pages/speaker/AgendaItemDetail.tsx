import { useState } from 'react'
import { Link } from 'react-router'
import { errorFromException, errorMessage } from '../../api/errors'
import { PATHS } from '../../auth/roles'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { cn } from '../../lib/cn'
import { formatSlot } from '../../lib/dateTime'
import { STATE_CLASS, STATE_LABEL, type AgendaItem } from './agendaModel'
import { useDeleteSlot, type Meeting } from './speakerData'
import { MEETING_FORMAT_LABEL, SLOT_FORMAT_DETAIL, classLine, closedByText, myAnswerLabel } from './speakerText'

const DELETE_CONFLICT: Partial<Record<string, string>> = {
  SLOT_HAS_PENDING_MEETINGS: 'Ce créneau a reçu une demande en attente : il ne peut plus être retiré.',
  SLOT_NOT_AVAILABLE: "Ce créneau n'est plus libre : il ne peut plus être retiré.",
}

function StateTag({ item }: { item: AgendaItem }) {
  return (
    <span className={cn('inline-flex rounded-pill border-2 px-3 py-0.5 text-[13px] font-black', STATE_CLASS[item.state])}>
      {STATE_LABEL[item.state]}
    </span>
  )
}

function Facts({ facts }: { facts: { label: string; value: string | null }[] }) {
  return (
    <dl className="grid gap-3">
      {facts
        .filter((fact): fact is { label: string; value: string } => Boolean(fact.value))
        .map((fact) => (
          <div key={fact.label} className="flex flex-col">
            <dt className="text-xs font-black uppercase tracking-[0.08em] text-muted">{fact.label}</dt>
            <dd className="font-bold text-ink">{fact.value}</dd>
          </div>
        ))}
    </dl>
  )
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
      <h3 className="text-xl">Créneau libre · {formatSlot(item.start, item.end)}</h3>
      <Facts facts={[{ label: 'Format accepté', value: slot ? SLOT_FORMAT_DETAIL[slot.formats] : null }]} />
      <p className="font-semibold text-muted">Aucune demande pour l'instant. Les écoles de votre zone le voient en premier.</p>
      {error && <Alert tone="error">{error}</Alert>}
      {slot !== null && (
        <Button variant="outline" size="md" className="self-start" onClick={() => setConfirming(true)}>
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
  return (
    <>
      <h3 className="text-xl">Créneau demandé · {formatSlot(item.start, item.end)}</h3>
      <Facts facts={[{ label: 'Format accepté', value: item.slot ? SLOT_FORMAT_DETAIL[item.slot.formats] : null }]} />
      <ul aria-label="Demandes sur ce créneau" className="flex flex-col gap-2">
        {pending.map((meeting) => (
          <li key={meeting.id} className="flex flex-col gap-1 rounded-block border-2 border-line p-3">
            <span className="font-extrabold text-ink">{meeting.schoolName}</span>
            {classLine(meeting) && <span className="text-sm font-semibold text-muted">{classLine(meeting)}</span>}
            <span className="text-sm font-bold text-terra-dark">{myAnswerLabel(meeting)}</span>
            <Link
              to={requestLink(meeting)}
              className="inline-flex min-h-touch items-center self-start font-extrabold text-indigo underline"
            >
              Répondre{' '}
              <span className="sr-only">à {meeting.schoolName}</span>
            </Link>
          </li>
        ))}
      </ul>
      {pending.length > 1 && (
        <p className="text-sm font-semibold text-muted">
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
      <h3 className="text-xl">{meeting.schoolName}</h3>
      <Facts
        facts={[
          { label: 'Classe', value: meeting.classTitle || null },
          { label: 'Horaire', value: formatSlot(item.start, item.end) },
          { label: 'Format', value: meeting.format ? MEETING_FORMAT_LABEL[meeting.format] : null },
          { label: 'Lieu', value: meeting.place },
          { label: 'Clôture', value: closed ? closedByText(meeting) : null },
          { label: 'Motif', value: closed ? meeting.reason : null },
        ]}
      />
      {meeting.message && (
        <section aria-label="Le mot de l'école" className="flex flex-col gap-2">
          <h4 className="text-lg">Le mot de l'école</h4>
          <blockquote className="whitespace-pre-line rounded-block border-l-[6px] border-orange bg-canvas px-4 py-3 font-semibold italic text-ink">
            {meeting.message}
          </blockquote>
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
      <StateTag item={item} />
      {item.state === 'FREE' && <FreeSlot item={item} onRemoved={onRemoved} />}
      {item.state === 'REQUESTED' && <RequestedSlot item={item} />}
      {item.main !== null && <MeetingDetail item={item} meeting={item.main} />}
    </article>
  )
}
