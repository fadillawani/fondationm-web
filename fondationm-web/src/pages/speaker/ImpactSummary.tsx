import { errorMessage } from '../../api/errors'
import { Alert } from '../../components/ui/Alert'
import { ErrorState } from '../../components/ui/ErrorState'
import { Spinner } from '../../components/ui/Spinner'
import { cn } from '../../lib/cn'
import { useNow } from '../../lib/useNow'
import { useWrittenFeedbacks } from '../feedback/feedbackData'
import { useMeetings } from './speakerData'
import { awaitingConfirmationText, caveats, computeImpact, emotionCounts, hoursLabel, schoolsLine } from './speakerImpact'

function Loading({ label }: { label: string }) {
  return (
    <div className="flex justify-center py-8 text-terra">
      <Spinner label={label} />
    </div>
  )
}

const CARD = 'flex flex-col gap-1 rounded-[20px] p-4 lg:p-5 text-white'
const VALUE = 'font-display text-[34px] leading-none lg:text-[48px]'

/** Indicateurs de « Mon impact » (maquette W2-impact) : 3 cartes, sans thèmes ni filles (décision 122). */
export function ImpactCards() {
  const now = useNow()
  const meetings = useMeetings()
  if (meetings.isPending) return <Loading label="Calcul de votre impact…" />
  if (meetings.isError) {
    return <ErrorState message={errorMessage(meetings.error)} onRetry={() => void meetings.refetch()} retrying={meetings.isFetching} />
  }
  const impact = computeImpact(meetings.data.items, now)
  const waiting = awaitingConfirmationText(impact.awaitingConfirmation)
  return (
    <div className="flex flex-col gap-3">
      {meetings.data.truncated && <Alert tone="warning">Chiffres partiels : toutes vos rencontres n'ont pas pu être chargées.</Alert>}
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className={cn(CARD, 'bg-terra')}>
          <dt className="sr-only">Élèves rencontrés</dt>
          <dd className="flex flex-col gap-1">
            <span className={VALUE}>{impact.studentsReached.toLocaleString('fr-FR')}</span>
            {/* Crème adoucie sur terracotta : 4,60:1 (la crème de la maquette fait 4,26:1). */}
            <span className="text-sm font-black text-cream-soft">élèves rencontrés</span>
            <span className="text-xs font-bold">Effectif déclaré des classes, pas un comptage des présents.</span>
          </dd>
        </div>
        <div className={cn(CARD, 'bg-indigo')}>
          <dt className="sr-only">Rencontres réalisées</dt>
          <dd className="flex flex-col gap-1">
            <span className={VALUE}>{impact.completed}</span>
            <span className="text-sm font-black text-cream">{impact.completed > 1 ? 'rencontres réalisées' : 'rencontre réalisée'}</span>
            <span className="text-xs font-bold">{schoolsLine(impact.schools)}</span>
          </dd>
        </div>
        <div className={cn(CARD, 'bg-green')}>
          <dt className="sr-only">Heures de transmission</dt>
          <dd className="flex flex-col gap-1">
            <span className={VALUE}>{hoursLabel(impact.totalMinutes)}</span>
            <span className="text-sm font-black text-cream">de transmission</span>
            <span className="text-xs font-bold">{impact.averageMinutes === null ? '—' : `${hoursLabel(impact.averageMinutes)} en moyenne`}</span>
          </dd>
        </div>
      </dl>
      {impact.completed === 0 && (
        <p className="rounded-[14px] bg-surface px-4 py-3 text-sm font-bold text-muted">Vos chiffres apparaîtront après votre première rencontre réalisée.</p>
      )}
      {[...caveats(impact), ...(waiting ? [waiting] : [])].map((line) => (
        <p key={line} className="text-[13px] font-bold text-muted">
          {line}
        </p>
      ))}
    </div>
  )
}

/** « Ce que vous avez ressenti » : émotions de mes retours rédigés (décision 123). */
export function EmotionsBlock() {
  const now = useNow()
  const written = useWrittenFeedbacks('speaker')
  const meetings = useMeetings()
  if (written.isPending) return <Loading label="Chargement de vos ressentis…" />
  if (written.isError) {
    return <ErrorState message={errorMessage(written.error)} onRetry={() => void written.refetch()} retrying={written.isFetching} />
  }
  const emotions = emotionCounts(written.data.items)
  const completed = meetings.data === undefined ? null : computeImpact(meetings.data.items, now).completed
  const feedbacks = written.data.items.length
  return (
    <div className="flex flex-col gap-2.5 rounded-[20px] bg-surface p-4 lg:p-5">
      <p className="text-sm font-bold text-muted">Les émotions qui reviennent dans vos retours.</p>
      {emotions.length === 0 ? (
        <p className="text-sm font-bold text-ink">
          <span aria-hidden="true">— </span>Aucune émotion notée dans vos retours pour l'instant.
        </p>
      ) : (
        <ul aria-label="Émotions de vos retours" className="flex flex-wrap gap-2">
          {emotions.map((emotion) => (
            <li key={emotion.label} className="rounded-pill bg-terra px-3.5 py-1.5 text-sm font-black text-white">
              {emotion.label} · {emotion.count}
            </li>
          ))}
        </ul>
      )}
      {completed !== null && (
        <p className="text-xs font-bold text-muted">
          D'après {feedbacks} {feedbacks > 1 ? 'retours' : 'retour'} sur {completed} {completed > 1 ? 'rencontres réalisées' : 'rencontre réalisée'}.
        </p>
      )}
      {written.data.truncated && <Alert tone="warning">Chiffres partiels : tous vos retours n'ont pas pu être chargés.</Alert>}
    </div>
  )
}
