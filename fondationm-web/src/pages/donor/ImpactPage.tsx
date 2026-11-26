import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { errorMessage } from '../../api/errors'
import { useCurrentUser } from '../../auth/currentUserContext'
import { donorNewRequestPath } from '../../auth/roles'
import { PageTitle } from '../../components/layout/PageTitle'
import { BackIcon } from '../../components/layout/icons'
import { Alert } from '../../components/ui/Alert'
import { ErrorState } from '../../components/ui/ErrorState'
import { PeriodTabs } from '../../components/ui/PeriodTabs'
import { Spinner } from '../../components/ui/Spinner'
import { Tabs } from '../../components/ui/Tabs'
import { panelId, tabId } from '../../components/ui/tabIds'
import { cn } from '../../lib/cn'
import { formatDayMonth, parseIso } from '../../lib/dateTime'
import { PERIOD_LABEL, periodBounds, periodFromParam, periodPhrase, type PeriodKind } from '../../lib/period'
import { useNow } from '../../lib/useNow'
import { FeedbackContent } from '../feedback/FeedbackContent'
import { quoteOf } from '../feedback/feedbackFormat'
import { ratingLabel } from '../feedback/feedbackText'
import { useDonorFeedbacks, useDonorImpact, type DonorFeedback, type DonorImpact } from './donorData'
import {
  FEEDBACK_FILTERS,
  FEEDBACK_FILTER_LABEL,
  authorLabel,
  countText,
  excerpt,
  feedbackSubject,
  matchesFilter,
  meetingDay,
  placeText,
  ratingDetail,
  ratingText,
  sortFeedbacks,
  type FeedbackFilter,
} from './donorModel'

const PERIOD_PANEL = 'rapport-periode'
const FILTER_IDS = 'retours-donateur'

/** Intertitres des récits côté donateur (maquette W4-impact). */
const DONOR_HEADINGS = {
  moment: 'Le moment fort',
  exchange: 'Un échange marquant',
  takeaway: 'Ce que cette rencontre a changé',
} as const

/** Texte « Ce que vous voyez » (décision 103) : vrai quel que soit le contenu des récits, non modérés. */
const WHAT_YOU_SEE =
  'Uniquement des retours validés par la Fondation M. Les fiches n’indiquent que la ville et le pays de l’école ; les récits sont publiés tels que leurs auteurs les ont écrits.'
const WHAT_YOU_SEE_SHORT = 'Validés par la Fondation M, publiés tels qu’écrits par leurs auteurs.'

interface DetailState {
  fromList?: boolean
}

function Loading({ label }: { label: string }) {
  return (
    <div className="flex justify-center py-8 text-terra">
      <Spinner label={label} />
    </div>
  )
}

const KPI_CARD = 'flex flex-col gap-1 rounded-[20px] bg-surface p-4 lg:p-5'
const KPI_LABEL = 'text-[11px] font-black uppercase tracking-[0.08em] text-muted lg:text-xs'
const KPI_VALUE = 'font-display text-[34px] leading-none text-ink lg:text-[44px]'

function KpiCards({ impact, kind }: { impact: DonorImpact; kind: PeriodKind }) {
  const detail = ratingDetail(impact.rating)
  const classes = impact.distinctClasses
  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div className={cn(KPI_CARD, 'col-span-2 bg-green text-white lg:col-span-1')}>
          <dt className="text-[11px] font-black uppercase tracking-[0.08em] lg:text-xs">Jeunes touchés</dt>
          <dd className="flex flex-col gap-1">
            <span className="font-display text-[44px] leading-none lg:text-[56px]">{countText(impact.studentsReached)}</span>
            <span className="text-sm font-bold">{periodPhrase(kind)}</span>
            <span className="text-xs font-bold">Effectif déclaré par les écoles, pas un comptage des présents.</span>
          </dd>
        </div>
        <div className={KPI_CARD}>
          <dt className={KPI_LABEL}>Rencontres réalisées</dt>
          <dd className="flex flex-col gap-1">
            <span className={KPI_VALUE}>{countText(impact.completedMeetings)}</span>
            <span className="text-xs font-bold text-muted">en classe, avec un professionnel</span>
          </dd>
        </div>
        <div className={KPI_CARD}>
          <dt className={KPI_LABEL}>Écoles engagées</dt>
          <dd className="flex flex-col gap-1">
            <span className={KPI_VALUE}>{countText(impact.distinctSchools)}</span>
            {classes !== null && (
              <span className="text-xs font-bold text-muted">
                dans {countText(classes)} {classes > 1 ? 'classes' : 'classe'}
              </span>
            )}
          </dd>
        </div>
        <div className={KPI_CARD}>
          <dt className={KPI_LABEL}>Intervenants engagés</dt>
          <dd className="flex flex-col gap-1">
            <span className={KPI_VALUE}>{countText(impact.distinctSpeakers)}</span>
            <span className="text-xs font-bold text-muted">bénévoles</span>
          </dd>
        </div>
        <div className={KPI_CARD}>
          <dt className={KPI_LABEL}>Note moyenne</dt>
          <dd className="flex flex-col gap-1">
            <span className={KPI_VALUE}>{ratingText(impact.rating.overall)}</span>
            <span className="text-xs font-bold text-muted">moyenne des notes publiées</span>
            {detail && <span className="text-xs font-bold text-muted">{detail}</span>}
          </dd>
        </div>
      </dl>
      {impact.completedMeetings === 0 && <p className="rounded-[14px] bg-surface px-4 py-3 text-sm font-bold text-muted">Aucune rencontre réalisée sur cette période.</p>}
    </div>
  )
}

function FeedbackList({ feedbacks, selectedId, onSelect }: { feedbacks: readonly DonorFeedback[]; selectedId: string | null; onSelect: (feedback: DonorFeedback) => void }) {
  return (
    <ul aria-label="Retours validés" className="flex flex-col gap-2">
      {feedbacks.map((feedback) => {
        const selected = feedback.id === selectedId
        const quote = excerpt(quoteOf(feedback.comment))
        const label = ratingLabel(feedback.rating)
        return (
          <li key={feedback.id}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(feedback)}
              className={cn(
                'flex w-full flex-col gap-1 rounded-[18px] border-2 bg-surface px-4 py-3 text-left',
                selected ? 'border-green' : 'border-transparent hover:border-line',
              )}
            >
              <span className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-black uppercase text-muted">{meetingDay(feedback)}</span>
                <span className="rounded-pill bg-canvas px-2 py-0.5 text-[11px] font-black text-ink">{authorLabel(feedback)}</span>
              </span>
              <span className="font-black text-ink">{placeText(feedback) || 'Lieu non précisé'}</span>
              {quote && <span className="text-[13px] font-semibold text-ink">« {quote} »</span>}
              {label && <span className="text-xs font-bold text-muted">Ressenti : {label}</span>}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function FeedbackDetail({ feedback }: { feedback: DonorFeedback }) {
  const published = parseIso(feedback.publishedAt)
  return (
    <article aria-label={`${authorLabel(feedback)}, ${meetingDay(feedback)}`} className="flex flex-col gap-4 rounded-[20px] bg-surface p-4 lg:p-5">
      <div className="flex flex-col gap-1">
        <span className="self-start rounded-pill bg-green px-2.5 py-1 text-xs font-black text-white">
          Validé par la Fondation M{published ? ` · le ${formatDayMonth(published)}` : ''}
        </span>
        <h3 className="text-[22px] lg:text-[26px]">{authorLabel(feedback)}</h3>
        <p className="text-sm font-bold text-muted">{[meetingDay(feedback), placeText(feedback)].filter(Boolean).join(' · ')}</p>
      </div>
      <FeedbackContent comment={feedback.comment} rating={feedback.rating} headings={DONOR_HEADINGS} ratingPrefix="Ressenti :" />
      <p className="flex flex-wrap items-center gap-2 border-t border-line pt-3 text-sm font-bold text-ink">
        Une question sur cette rencontre ?
        <Link to={donorNewRequestPath(feedbackSubject(feedback))} className="inline-flex min-h-touch items-center font-black text-indigo underline underline-offset-2">
          Écrire à la Fondation
        </Link>
      </p>
    </article>
  )
}

/**
 * « Rapport d'impact » du donateur (maquette W4-impact). URL : `?periode=trimestre|annee`, `?filtre=ecoles|intervenants`,
 * `?retour={id}`. Un appel d'impact et une page 0 de retours par période affichée (décision 99) ; filtre côté client.
 */
export function ImpactPage() {
  const user = useCurrentUser()
  const now = useNow()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const kind = periodFromParam(params.get('periode'))
  const filter = FEEDBACK_FILTERS.find((value) => value === params.get('filtre')) ?? 'tous'
  const period = periodBounds(kind, now)
  const impact = useDonorImpact(period)
  const feedbacks = useDonorFeedbacks(period)

  const all = sortFeedbacks(feedbacks.data?.items ?? [])
  const visible = all.filter((feedback) => matchesFilter(feedback, filter))
  const selectedId = params.get('retour')
  const explicit = selectedId === null ? undefined : visible.find((feedback) => feedback.id === selectedId)
  const current = explicit ?? visible[0]
  const detailOpen = explicit !== undefined

  function update(changes: Record<string, string | null>, { replace = false, state }: { replace?: boolean; state?: DetailState } = {}) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key)
      else next.set(key, value)
    }
    setParams(next, { replace, state })
  }

  function back() {
    const state = location.state as DetailState | null
    if (state?.fromList === true) void navigate(-1)
    else update({ retour: null }, { replace: true })
  }

  const filterLabels: Record<FeedbackFilter, string> = {
    tous: feedbacks.data === undefined ? 'Tous' : `Tous · ${all.length}`,
    ecoles: FEEDBACK_FILTER_LABEL.ecoles,
    intervenants: FEEDBACK_FILTER_LABEL.intervenants,
  }

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <div className={cn('flex flex-col gap-4', detailOpen && 'hidden lg:flex')}>
        <PageTitle
          kicker="Rapport d'impact"
          title={`Bonjour ${user.displayName}`}
          subtitle="Voici ce que votre soutien a fait naître dans les classes accompagnées par la Fondation M."
          mobileSubtitle="Voici ce que votre soutien a fait naître dans les classes accompagnées par la Fondation M."
        />
        <PeriodTabs
          value={kind}
          panelId={PERIOD_PANEL}
          onChange={(next) => update({ periode: next === 'trimestre' ? null : next, retour: null })}
        />
      </div>

      <div role="tabpanel" id={PERIOD_PANEL} aria-labelledby={`periode-${kind}`} className="flex flex-col gap-5">
        <section aria-label={`Indicateurs : ${PERIOD_LABEL[kind].toLocaleLowerCase('fr-FR')}`} className={cn(detailOpen && 'hidden lg:block')}>
          {impact.isPending ? (
            <Loading label="Chargement des indicateurs…" />
          ) : impact.isError ? (
            <ErrorState message={errorMessage(impact.error)} onRetry={() => void impact.refetch()} retrying={impact.isFetching} />
          ) : (
            <KpiCards impact={impact.data} kind={kind} />
          )}
        </section>

        <section aria-labelledby="retours-titre" className="flex flex-col gap-3">
          <div className={cn('flex flex-col gap-1', detailOpen && 'hidden lg:flex')}>
            <h2 id="retours-titre" className="text-2xl">
              Retours d'expérience validés
            </h2>
            <p className="hidden text-sm font-bold text-muted lg:block">Ce que les écoles et les intervenants racontent, après chaque rencontre.</p>
            <aside aria-label="Ce que vous voyez" className="rounded-[14px] bg-cream px-4 py-3 text-[13px] font-bold text-ink">
              <span className="hidden lg:inline">
                <strong className="font-black">Ce que vous voyez. </strong>
                {WHAT_YOU_SEE}
              </span>
              <span className="lg:hidden">{WHAT_YOU_SEE_SHORT}</span>
            </aside>
          </div>

          {feedbacks.isPending ? (
            <Loading label="Chargement des retours…" />
          ) : feedbacks.isError ? (
            <ErrorState message={errorMessage(feedbacks.error)} onRetry={() => void feedbacks.refetch()} retrying={feedbacks.isFetching} />
          ) : (
            <div className="flex flex-col gap-3">
              {feedbacks.data.truncated && <Alert tone="warning">Tous les retours n'ont pas pu être chargés.</Alert>}
              <div className={cn(detailOpen && 'hidden lg:block')}>
                <Tabs
                  size="sm"
                  label="Auteur des retours"
                  idPrefix={FILTER_IDS}
                  value={filter}
                  onChange={(value) => update({ filtre: value === 'tous' ? null : value, retour: null })}
                  items={FEEDBACK_FILTERS.map((value) => ({ value, label: filterLabels[value] }))}
                />
              </div>
              <div role="tabpanel" id={panelId(FILTER_IDS)} aria-labelledby={tabId(FILTER_IDS, filter)}>
                {visible.length === 0 ? (
                  <p className="rounded-[18px] bg-surface p-4 font-bold text-muted">
                    {all.length === 0 ? 'Pas encore de retour validé sur cette période. Ils arrivent après chaque rencontre.' : 'Aucun retour de ce type sur cette période.'}
                  </p>
                ) : (
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
                    <div className={cn(detailOpen && 'hidden lg:block')}>
                      <FeedbackList
                        feedbacks={visible}
                        selectedId={current?.id ?? null}
                        onSelect={(feedback) => update({ retour: feedback.id }, { state: { fromList: true } })}
                      />
                    </div>
                    {current && (
                      <section aria-label="Retour choisi" aria-live="polite" className={cn('flex flex-col gap-3', !detailOpen && 'hidden lg:flex')}>
                        <button
                          type="button"
                          onClick={back}
                          className="inline-flex min-h-touch items-center gap-1 self-start text-sm font-black text-ink lg:hidden"
                        >
                          <BackIcon className="size-5" />
                          Rapport d'impact
                        </button>
                        <FeedbackDetail key={current.id} feedback={current} />
                      </section>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
