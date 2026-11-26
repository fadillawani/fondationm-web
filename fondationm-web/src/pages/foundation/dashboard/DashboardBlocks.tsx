import { Link } from 'react-router'
import { PATHS, foundationFeedbackPath } from '../../../auth/roles'
import { cn } from '../../../lib/cn'
import { plural } from '../meetings/foundationMeetingState'
import type { Indicators, Moment } from './dashboardData'
import { chartLabel, momentTitle, periodPhrase, ratingText, type Bucket, type PeriodKind } from './dashboardModel'

// ——— « À faire » ———

export interface TodoItem {
  key: string
  count: number | null
  label: string
  detail: string
  /** Absent : page pas encore livrée (« Bientôt »). */
  to?: string
}

function TodoContent({ item }: { item: TodoItem }) {
  return (
    <>
      <span className="w-[30px] shrink-0 font-display text-[26px] leading-none text-terra lg:w-auto lg:text-4xl">
        {item.count === null ? '…' : item.count}
      </span>
      <span className="flex min-w-0 flex-1 flex-col lg:gap-1">
        <span className="font-black first-letter:uppercase lg:text-[15px] lg:first-letter:normal-case">{item.label}</span>
        <span className="text-xs font-bold text-muted lg:text-[13px]">{item.count === 0 ? 'Rien à traiter' : item.detail}</span>
      </span>
    </>
  )
}

const TODO_CARD =
  'flex min-h-14 items-center gap-3 rounded-2xl bg-surface px-3.5 py-2.5 text-ink lg:min-h-0 lg:flex-col lg:items-start lg:gap-1 lg:rounded-[20px] lg:border-2 lg:border-line lg:p-4'

/** Cartes « À faire » (maquette W3-pilotage) : lignes avec chevron sur mobile, cartes sur PC. */
export function TodoCards({ items }: { items: readonly TodoItem[] }) {
  return (
    <ul className="flex flex-col gap-2 lg:grid lg:grid-cols-[repeat(auto-fit,minmax(170px,1fr))] lg:gap-3">
      {items.map((item) => (
        <li key={item.key} className="flex">
          {item.to ? (
            <Link to={item.to} className={cn(TODO_CARD, 'w-full hover:border-muted')}>
              <TodoContent item={item} />
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="#4A4A57" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="size-[18px] shrink-0 lg:hidden">
                <path d="m9 6 6 6-6 6" />
              </svg>
            </Link>
          ) : (
            <div className={cn(TODO_CARD, 'w-full')}>
              <TodoContent item={item} />
              <span className="shrink-0 rounded-pill bg-canvas px-2 py-0.5 text-[11px] font-black text-muted">Bientôt</span>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

// ——— Indicateurs ———

const KPI_LABEL = 'text-[11px] font-black uppercase lg:text-xs lg:tracking-[0.1em]'
const KPI_VALUE = 'font-display text-[34px] leading-none lg:text-[50px] lg:leading-[0.95]'

interface KpiProps {
  indicators: Indicators
  kind: PeriodKind
  completion: { completed: number; base: number; rate: number | null }
}

/** Quatre indicateurs de la période ; « Délais de validation » (sans données) est remplacé par « Notes moyennes ». */
export function KpiCards({ indicators, kind, completion }: KpiProps) {
  const feedbackTotal = indicators.publishedFeedbacks + indicators.submittedFeedbacks
  const share = feedbackTotal === 0 ? 0 : Math.round((indicators.publishedFeedbacks / feedbackTotal) * 100)
  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-[repeat(auto-fit,minmax(220px,1fr))] lg:gap-3.5">
      <div className="flex flex-col gap-0.5 rounded-[18px] bg-green p-3.5 text-white lg:gap-1 lg:rounded-[22px] lg:p-5">
        <span className={cn(KPI_LABEL, 'text-cream')}>Jeunes touchés</span>
        <span className={cn(KPI_VALUE, 'text-cream')}>{indicators.studentsReached.toLocaleString('fr-FR')}</span>
        <span className="text-xs font-bold lg:text-[13px]">
          {periodPhrase(kind)} · {plural(indicators.distinctSchools, 'établissement', 'établissements')}
        </span>
        <span className="text-[11px] font-semibold lg:text-xs">Effectif déclaré par les écoles, pas un comptage des présents.</span>
      </div>
      <div className="flex flex-col gap-0.5 rounded-[18px] bg-indigo p-3.5 text-white lg:gap-1 lg:rounded-[22px] lg:p-5">
        <span className={cn(KPI_LABEL, 'text-cream')}>
          <span className="lg:hidden">Réalisation</span>
          <span className="hidden lg:inline">Taux de réalisation</span>
        </span>
        <span className={cn(KPI_VALUE, 'text-cream')}>{completion.rate === null ? '—' : `${completion.rate} %`}</span>
        <span className="text-xs font-bold lg:text-[13px]">
          {completion.base === 0
            ? 'Aucune rencontre confirmée passée'
            : `${plural(completion.completed, 'réalisée', 'réalisées')} sur ${plural(completion.base, 'confirmée passée', 'confirmées passées')}`}
        </span>
      </div>
      <div className="flex flex-col gap-0.5 rounded-[18px] bg-surface p-3.5 lg:gap-2 lg:rounded-[22px] lg:p-5">
        <span className={cn(KPI_LABEL, 'text-muted')}>
          <span className="lg:hidden">Retours validés</span>
          <span className="hidden lg:inline">Retours d'expérience</span>
        </span>
        <span className="flex items-baseline gap-2">
          <span className="font-display text-[34px] leading-none text-green lg:text-[44px] lg:leading-[0.95]">{indicators.publishedFeedbacks}</span>
          <span className="hidden text-sm font-extrabold lg:inline">validés</span>
        </span>
        <span
          role="img"
          aria-label={`${share} % des retours de la période sont validés`}
          className="hidden h-2.5 overflow-hidden rounded-pill bg-[#EDE6D6] lg:flex"
        >
          <span className="bg-green" style={{ width: `${share}%` }} />
        </span>
        <span className="text-xs font-bold text-muted lg:text-[13px]">{indicators.submittedFeedbacks} à valider</span>
      </div>
      <div className="flex flex-col gap-0.5 rounded-[18px] bg-surface p-3.5 lg:gap-2 lg:rounded-[22px] lg:p-5">
        <span className={cn(KPI_LABEL, 'text-muted')}>Notes moyennes</span>
        <span className="font-display text-[34px] leading-none lg:hidden">{ratingText(indicators.ratingOverall)}</span>
        <span className="text-xs font-bold text-muted lg:hidden">
          écoles : {ratingText(indicators.ratingSchool)} · intervenants : {ratingText(indicators.ratingSpeaker)}
        </span>
        <dl className="hidden flex-col gap-2 lg:flex">
          {[
            ['Globale', indicators.ratingOverall],
            ['Écoles', indicators.ratingSchool],
            ['Intervenants', indicators.ratingSpeaker],
          ].map(([label, value]) => (
            <div key={String(label)} className="flex items-baseline justify-between">
              <dt className="text-sm font-extrabold">{label}</dt>
              <dd className="font-display text-[26px]">{ratingText(typeof value === 'number' ? value : null)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}

// ——— Graphique ———

/** Contour 1 px `#4A4A57` sur « Prévues » et « Annulées » : leurs couleurs passent sous 3:1 sur fond clair. */
const PLANNED = 'bg-[#9DAA3C] border border-muted'

export function MeetingsChart({ buckets, kind }: { buckets: readonly Bucket[]; kind: PeriodKind }) {
  const max = Math.max(1, ...buckets.map((bucket) => bucket.done + bucket.planned))
  const empty = buckets.every((bucket) => bucket.done + bucket.planned === 0)
  const title = kind === 'trimestre' ? 'Rencontres par mois' : 'Rencontres par trimestre'
  return (
    <section aria-labelledby="graphique-rencontres" className="flex min-w-0 flex-col gap-2.5 rounded-[20px] bg-surface p-4 lg:flex-[3_1_460px] lg:gap-3.5 lg:rounded-[22px] lg:p-[22px]">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="graphique-rencontres" className="text-lg uppercase lg:text-[21px]">
          {title}
        </h2>
        <ul aria-label="Légende" className="flex gap-3 text-[11px] font-extrabold text-muted lg:text-xs">
          <li className="flex items-center gap-[5px]">
            <span aria-hidden="true" className="size-2.5 rounded-[3px] bg-indigo lg:size-3" />
            Réalisées
          </li>
          <li className="flex items-center gap-[5px]">
            <span aria-hidden="true" className={cn('size-2.5 rounded-[3px] lg:size-3', PLANNED)} />
            Prévues
          </li>
        </ul>
      </div>
      {empty ? (
        <p className="py-6 text-sm font-bold text-muted">Aucune rencontre sur cette période.</p>
      ) : (
        <>
          <div role="img" aria-label={chartLabel(buckets, kind)} className="flex h-[140px] items-end gap-3.5 border-b-2 border-line px-1.5 lg:h-[220px] lg:gap-[18px]">
            {buckets.map((bucket) => (
              <div key={bucket.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1 lg:gap-1.5">
                <span className="text-[13px] font-black lg:text-sm">{bucket.done + bucket.planned}</span>
                <div className="flex w-full max-w-[72px] flex-col overflow-hidden rounded-t-[8px] lg:rounded-t-[10px]" style={{ height: `${((bucket.done + bucket.planned) / max) * 77}%` }}>
                  {bucket.planned > 0 && <div className={PLANNED} style={{ flexGrow: bucket.planned }} />}
                  {bucket.done > 0 && <div className="bg-indigo" style={{ flexGrow: bucket.done }} />}
                </div>
              </div>
            ))}
          </div>
          <div aria-hidden="true" className="flex gap-3.5 px-1.5 lg:gap-[18px]">
            {buckets.map((bucket) => (
              <span key={bucket.label} className="flex-1 text-center text-xs font-extrabold text-muted lg:text-[13px]">
                {bucket.label}
              </span>
            ))}
          </div>
        </>
      )}
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Période</th>
            <th scope="col">Réalisées</th>
            <th scope="col">Prévues</th>
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((bucket) => (
            <tr key={bucket.label}>
              <th scope="row">{bucket.longLabel}</th>
              <td>{bucket.done}</td>
              <td>{bucket.planned}</td>
              <td>{bucket.done + bucket.planned}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

// ——— Rencontres par statut ———

const STATUS_ROWS = [
  { key: 'PENDING', label: 'En attente', bar: 'bg-orange' },
  { key: 'CONFIRMED', label: 'Confirmées', bar: 'bg-green' },
  { key: 'COMPLETED', label: 'Réalisées', bar: 'bg-indigo' },
  { key: 'REFUSED', label: 'Refusées', bar: 'bg-red' },
  { key: 'CANCELLED', label: 'Annulées', bar: 'bg-[#C9BFA8] border border-muted' },
] as const

/** Barres par statut (`byStatus`), une ligne-lien de 44 px vers les rencontres ; masquées sur mobile (maquette). */
export function StatusBars({ byStatus }: { byStatus: Indicators['byStatus'] }) {
  const max = Math.max(1, ...STATUS_ROWS.map((row) => byStatus[row.key]))
  return (
    <section aria-labelledby="rencontres-statut" className="hidden min-w-0 flex-col gap-3 rounded-[22px] bg-surface p-[22px] lg:flex lg:flex-[2_1_320px]">
      <h2 id="rencontres-statut" className="text-[21px] uppercase">
        Rencontres par statut
      </h2>
      <ul className="flex flex-col">
        {STATUS_ROWS.map((row) => {
          const value = byStatus[row.key]
          return (
            <li key={row.key}>
              <Link to={PATHS.foundationMeetings} aria-label={`${row.label} : ${value}`} className="flex min-h-touch items-center gap-3 text-ink">
                <span className="w-24 shrink-0 text-sm font-extrabold">{row.label}</span>
                <span aria-hidden="true" className="flex h-3.5 flex-1 overflow-hidden rounded-pill bg-canvas">
                  <span className={cn('rounded-pill', row.bar)} style={{ width: `${value === 0 ? 0 : Math.max(4, Math.round((value / max) * 100))}%` }} />
                </span>
                <span className="w-8 text-right font-display text-xl">{value}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// ——— Le moment ———

export function MomentCard({ moment, now }: { moment: Moment; now: Date }) {
  const title = momentTitle(moment.publishedAt, now)
  return (
    <section
      aria-label={title}
      className="flex flex-col gap-1.5 rounded-[20px] border-2 border-yellow bg-cream p-4 lg:flex-row lg:flex-wrap lg:items-center lg:gap-[18px] lg:rounded-[22px] lg:p-[22px]"
    >
      <div className="flex flex-col gap-1.5 lg:flex-[1_1_420px] lg:gap-2">
        <span className="text-[11px] font-black uppercase text-[#7A4100] lg:text-xs lg:tracking-[0.1em]">{title}</span>
        <blockquote className="font-display text-[19px] leading-[1.25] lg:text-2xl">« {moment.comment} »</blockquote>
        <span className="text-[13px] font-extrabold lg:text-sm">
          {moment.author}, {moment.context}
        </span>
      </div>
      <Link
        to={moment.meetingId === null ? PATHS.foundationFeedbacks : foundationFeedbackPath(moment.meetingId)}
        className="inline-flex min-h-12 items-center gap-2 self-start rounded-[14px] bg-ink px-[18px] text-sm font-black text-cream lg:self-center"
      >
        Lire les retours
      </Link>
    </section>
  )
}
