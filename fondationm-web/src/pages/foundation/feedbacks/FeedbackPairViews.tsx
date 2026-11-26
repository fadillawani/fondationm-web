import { useRef, useState } from 'react'
import { errorMessage } from '../../../api/errors'
import { Alert } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { cn } from '../../../lib/cn'
import { formatDay, parseIso } from '../../../lib/dateTime'
import { FeedbackContent } from '../../feedback/FeedbackContent'
import { StepBadge } from '../../feedback/FeedbackParts'
import { stepOf } from '../../feedback/feedbackText'
import { pairSteps, pairTitle, type MeetingFeedbackPair } from './foundationFeedbackModel'
import { usePublishFeedback, type FoundationFeedback } from './foundationFeedbacksData'

function dayOf(iso: string | null): string {
  const start = parseIso(iso)
  return start ? formatDay(start) : 'Date inconnue'
}

interface PairListProps {
  pairs: readonly MeetingFeedbackPair[]
  selectedId: string | null
  onSelect: (pair: MeetingFeedbackPair) => void
}

/** Liste des rencontres et de l'état de leurs deux retours (maquette W3-retours). */
export function PairList({ pairs, selectedId, onSelect }: PairListProps) {
  return (
    <ul aria-label="Rencontres" className="flex flex-col gap-2">
      {pairs.map((pair) => {
        const steps = pairSteps(pair)
        const selected = pair.meetingId === selectedId
        return (
          <li key={pair.meetingId}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(pair)}
              className={cn(
                'flex w-full flex-col gap-1.5 rounded-[18px] border-2 bg-surface px-4 py-3 text-left',
                selected ? 'border-ink' : 'border-transparent hover:border-line',
              )}
            >
              <span className="text-xs font-black uppercase text-muted">{dayOf(pair.startAt)}</span>
              <span className="font-black text-ink">{pairTitle(pair)}</span>
              <span className="flex flex-wrap gap-2 text-xs font-bold text-ink">
                <span className="inline-flex items-center gap-1.5">
                  École · <StepBadge step={steps.school} className="px-2 py-0.5" />
                </span>
                <span className="inline-flex items-center gap-1.5">
                  Intervenant · <StepBadge step={steps.speaker} className="px-2 py-0.5" />
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export type FeedbackPart = 'ecole' | 'intervenant'

interface FeedbackCardProps {
  part: FeedbackPart
  pair: MeetingFeedbackPair
  feedback: FoundationFeedback | null
  /** Masquée sur mobile quand l'autre partie est choisie. */
  hiddenOnMobile: boolean
  onPin: () => void
}

/** Carte d'un retour : auteur, état, contenu relu par le parseur, publication confirmée (décision 94). */
function FeedbackCard({ part, pair, feedback, hiddenOnMobile, onPin }: FeedbackCardProps) {
  const publish = usePublishFeedback()
  const [confirming, setConfirming] = useState(false)
  const [justPublished, setJustPublished] = useState(false)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const step = stepOf(feedback?.status ?? null)
  const title = part === 'ecole' ? 'Retour de l’école' : 'Retour de l’intervenant'
  const author = part === 'ecole' ? pair.schoolName : pair.speakerName

  function confirm() {
    if (feedback === null) return
    onPin()
    publish.mutate(feedback.id, {
      onSuccess: () => {
        setConfirming(false)
        setJustPublished(true)
      },
      onError: () => setConfirming(false),
    })
  }

  return (
    <section
      id={`retour-${part}`}
      aria-label={title}
      className={cn(
        'flex flex-col gap-3 rounded-[20px] border-2 border-line border-l-[8px] bg-surface p-4 lg:p-5',
        // Bande d'accent décorative : l'orange (2,82:1 sur blanc) ne porte jamais de texte.
        part === 'ecole' ? 'border-l-indigo' : 'border-l-orange',
        hiddenOnMobile && 'hidden lg:flex',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-sans text-xs font-black uppercase tracking-[0.08em] text-muted">{title}</h3>
        <StepBadge step={step} />
      </div>
      <p className="font-black text-ink">{author}</p>
      {feedback === null ? (
        <p className="rounded-[12px] bg-canvas px-3 py-2 text-sm font-semibold text-ink">Ce retour n'a pas encore été écrit.</p>
      ) : (
        <FeedbackContent comment={feedback.comment} rating={feedback.rating} />
      )}
      {feedback?.status === 'SUBMITTED' && (
        <Button size="md" variant="success" onClick={() => setConfirming(true)} className="self-start">
          <span className="hidden lg:inline">Valider et partager aux donateurs</span>
          <span className="lg:hidden">Valider et partager</span>
        </Button>
      )}
      <div aria-live="polite" className="empty:hidden">
        {feedback?.status === 'PUBLISHED' && (
          <p className="text-sm font-black text-green">
            {justPublished ? 'Validé ! Ce retour apparaît maintenant dans le rapport d’impact des donateurs.' : 'Visible dans le rapport d’impact des donateurs.'}
          </p>
        )}
      </div>
      {publish.isError && <Alert tone="error">{errorMessage(publish.error)}</Alert>}
      <Modal
        open={confirming}
        title="Publier ce retour ?"
        onClose={() => setConfirming(false)}
        initialFocus={cancelRef}
        footer={
          <>
            <Button ref={cancelRef} size="md" variant="outline" onClick={() => setConfirming(false)} disabled={publish.isPending}>
              Annuler
            </Button>
            <Button size="md" variant="success" onClick={confirm} loading={publish.isPending}>
              Publier
            </Button>
          </>
        }
      >
        <p className="text-[15px] font-semibold text-ink">Il sera visible des donateurs et ne pourra plus être retiré.</p>
      </Modal>
    </section>
  )
}

interface PairDetailProps {
  pair: MeetingFeedbackPair
  part: FeedbackPart
  onPin: () => void
}

export function PairDetail({ pair, part, onPin }: PairDetailProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 rounded-[20px] bg-surface p-4 lg:p-5">
        <h2 className="text-[22px] lg:text-[26px]">{pairTitle(pair)}</h2>
        <p className="text-sm font-bold text-muted">{[dayOf(pair.startAt), pair.classTitle, pair.schoolCity].filter(Boolean).join(' · ')}</p>
        <span className="mt-1 self-start rounded-pill bg-indigo px-2.5 py-1 text-xs font-black text-cream">Rencontre réalisée</span>
      </div>
      <FeedbackCard key={pair.school?.id ?? 'ecole'} part="ecole" pair={pair} feedback={pair.school} hiddenOnMobile={part !== 'ecole'} onPin={onPin} />
      <FeedbackCard key={pair.speaker?.id ?? 'intervenant'} part="intervenant" pair={pair} feedback={pair.speaker} hiddenOnMobile={part !== 'intervenant'} onPin={onPin} />
    </div>
  )
}
