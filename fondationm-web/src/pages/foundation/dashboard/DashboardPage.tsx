import { useRef, type KeyboardEvent } from 'react'
import { useSearchParams } from 'react-router'
import { errorMessage } from '../../../api/errors'
import { PATHS } from '../../../auth/roles'
import { PageTitle } from '../../../components/layout/PageTitle'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Spinner } from '../../../components/ui/Spinner'
import { cn } from '../../../lib/cn'
import { formatDayMonth, parseIso } from '../../../lib/dateTime'
import { useNow } from '../../../lib/useNow'
import { useDonorRequests } from '../donors/donorsData'
import { useFoundationMeetings } from '../meetings/foundationMeetingsData'
import { LATE_AFTER_DAYS, isAwaitingFoundation, isToMark, plural, waitingDays } from '../meetings/foundationMeetingState'
import { useIndicators, useLatestMoment } from './dashboardData'
import { KpiCards, MeetingsChart, MomentCard, StatusBars, TodoCards, type TodoItem } from './DashboardBlocks'
import {
  PERIODS,
  PERIOD_LABEL,
  actionsSentence,
  completionRate,
  meetingBuckets,
  periodBounds,
  todayLabels,
  type PeriodKind,
} from './dashboardModel'

const PANEL_ID = 'indicateurs-periode'

function Loading({ label }: { label: string }) {
  return (
    <div className="flex justify-center py-8 text-terra">
      <Spinner label={label} />
    </div>
  )
}

/** Sélecteur « Ce trimestre / Cette année » (contrôle segmenté de la maquette) : onglets, flèches. */
function PeriodTabs({ value, onChange }: { value: PeriodKind; onChange: (kind: PeriodKind) => void }) {
  const refs = useRef<Partial<Record<PeriodKind, HTMLButtonElement | null>>>({})
  function move(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (delta === 0) return
    event.preventDefault()
    const next = PERIODS[(index + delta + PERIODS.length) % PERIODS.length]
    if (next === undefined) return
    onChange(next)
    refs.current[next]?.focus()
  }
  return (
    <div role="tablist" aria-label="Période" className="flex gap-1 self-start rounded-[14px] bg-surface p-1">
      {PERIODS.map((kind, index) => {
        const active = kind === value
        return (
          <button
            key={kind}
            ref={(node) => {
              refs.current[kind] = node
            }}
            type="button"
            role="tab"
            id={`periode-${kind}`}
            aria-selected={active}
            aria-controls={PANEL_ID}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(kind)}
            onKeyDown={(event) => move(event, index)}
            className={cn('min-h-touch rounded-[10px] px-3.5 text-sm font-black', active ? 'bg-ink text-cream' : 'text-ink')}
          >
            {PERIOD_LABEL[kind]}
          </button>
        )
      })}
    </div>
  )
}

/**
 * « Tableau de bord » de la Fondation (maquette W3-pilotage) : « À faire » (instantanés sans période), indicateurs
 * de la période (`?periode=trimestre|annee`), rencontres par mois et par statut, moment marquant.
 */
export function DashboardPage() {
  const now = useNow()
  const [params, setParams] = useSearchParams()
  const kind = PERIODS.find((value) => value === params.get('periode')) ?? 'trimestre'
  const period = periodBounds(kind, now)
  const snapshot = useIndicators(null)
  const indicators = useIndicators(period)
  const meetings = useFoundationMeetings()
  const requests = useDonorRequests()
  const moment = useLatestMoment()
  const today = todayLabels(now)

  const meetingItems = meetings.data?.items
  const late = meetingItems?.filter((meeting) => isAwaitingFoundation(meeting) && (waitingDays(meeting, now) ?? 0) >= LATE_AFTER_DAYS).length
  const toMark = meetingItems?.filter((meeting) => isToMark(meeting, now)).length
  const open = (requests.data?.items ?? [])
    .filter((request) => request.status === 'OPEN')
    .toSorted((a, b) => (parseIso(a.createdAt)?.getTime() ?? 0) - (parseIso(b.createdAt)?.getTime() ?? 0))
  const oldest = open[0]
  const oldestDate = oldest ? parseIso(oldest.createdAt) : null
  const snap = snapshot.data

  const todo: TodoItem[] = snap
    ? [
        {
          key: 'comptes',
          count: snap.schoolsPending + snap.speakersPending,
          label: 'comptes à valider',
          detail: `${plural(snap.schoolsPending, 'école', 'écoles')} · ${plural(snap.speakersPending, 'intervenant', 'intervenants')}`,
          to: PATHS.foundationAccounts,
        },
        {
          key: 'demandes',
          count: snap.awaitingFoundation,
          label: 'demandes de rencontre',
          detail: late === undefined ? '…' : `dont ${late} en attente depuis 2 jours ou plus`,
          to: PATHS.foundationRequests,
        },
        {
          key: 'rencontres',
          count: toMark ?? null,
          label: 'rencontres à marquer',
          detail: 'passées, encore « confirmées »',
          to: PATHS.foundationMeetings,
        },
        { key: 'retours', count: snap.submittedFeedbacks, label: 'retours à valider', detail: 'avant partage aux donateurs' },
        {
          key: 'requetes',
          count: snap.openDonorRequests,
          label: snap.openDonorRequests > 1 ? 'requêtes donateurs' : 'requête donateur',
          detail:
            oldest === undefined
              ? requests.isPending
                ? '…'
                : '—'
              : open.length > 1
                ? `${open.length} requêtes, la plus ancienne depuis le ${oldestDate ? formatDayMonth(oldestDate) : '—'}`
                : `${oldest.donorName}, depuis le ${oldestDate ? formatDayMonth(oldestDate) : '—'}`,
          to: PATHS.foundationDonorRequests,
        },
      ]
    : []
  const total = todo.every((item) => item.count !== null) ? todo.reduce((sum, item) => sum + (item.count ?? 0), 0) : null

  function choosePeriod(next: PeriodKind) {
    const search = new URLSearchParams(params)
    if (next === 'trimestre') search.delete('periode')
    else search.set('periode', next)
    setParams(search, { replace: true })
  }

  return (
    <div className="flex flex-col gap-4 lg:gap-[22px]">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between lg:gap-4">
        <PageTitle
          kicker={today.long}
          mobileKicker={today.short}
          title="Bonjour l'équipe"
          subtitle={total === null ? undefined : actionsSentence(total)}
          mobileSubtitle={total === null ? undefined : actionsSentence(total)}
        />
        <PeriodTabs value={kind} onChange={choosePeriod} />
      </div>

      <section aria-labelledby="a-faire" className="flex flex-col gap-2 lg:gap-3">
        <h2 id="a-faire" className="text-[19px] uppercase lg:text-[22px]">
          À faire
          {total !== null && <span className="lg:hidden"> · {total}</span>}
        </h2>
        {snapshot.isPending ? (
          <Loading label="Chargement des actions…" />
        ) : snapshot.isError ? (
          <ErrorState message={errorMessage(snapshot.error)} onRetry={() => void snapshot.refetch()} retrying={snapshot.isFetching} />
        ) : (
          <TodoCards items={todo} />
        )}
      </section>

      <div role="tabpanel" id={PANEL_ID} aria-labelledby={`periode-${kind}`} className="flex flex-col gap-4 lg:gap-5">
        <section aria-label={`Indicateurs : ${PERIOD_LABEL[kind].toLocaleLowerCase('fr-FR')}`}>
          {indicators.isPending || meetings.isPending ? (
            <Loading label="Chargement des indicateurs…" />
          ) : indicators.isError ? (
            <ErrorState message={errorMessage(indicators.error)} onRetry={() => void indicators.refetch()} retrying={indicators.isFetching} />
          ) : (
            <KpiCards indicators={indicators.data} kind={kind} completion={completionRate(meetingItems ?? [], period, now)} />
          )}
        </section>

        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-stretch lg:gap-5">
          {meetings.isPending ? (
            <Loading label="Chargement des rencontres…" />
          ) : meetings.isError ? (
            <ErrorState message={errorMessage(meetings.error)} onRetry={() => void meetings.refetch()} retrying={meetings.isFetching} />
          ) : (
            <MeetingsChart buckets={meetingBuckets(meetingItems ?? [], period, now)} kind={kind} />
          )}
          {indicators.data && <StatusBars byStatus={indicators.data.byStatus} />}
        </div>
      </div>

      {moment.isError ? (
        <ErrorState message={errorMessage(moment.error)} onRetry={() => void moment.refetch()} retrying={moment.isFetching} />
      ) : (
        moment.data && <MomentCard moment={moment.data} now={now} />
      )}
    </div>
  )
}
