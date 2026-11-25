import { Link } from 'react-router'
import { errorMessage } from '../../../api/errors'
import { feedbackFormPath } from '../../../auth/roles'
import { PageTitle } from '../../../components/layout/PageTitle'
import { Alert } from '../../../components/ui/Alert'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Spinner } from '../../../components/ui/Spinner'
import { formatCompactDay, parseIso } from '../../../lib/dateTime'
import { useAwaitingFeedbacks, useWrittenFeedbacks } from '../../feedback/feedbackData'
import { StepBadge } from '../../feedback/FeedbackParts'
import type { FeedbackStep } from '../../feedback/feedbackText'
import { useSchoolMeetings } from '../meetingsData'

interface Row {
  meetingId: string
  name: string
  detail: string
  startAt: string | null
  step: FeedbackStep
}

const ACTION: Record<FeedbackStep, string> = {
  'À rédiger': 'Partager mon retour',
  Soumis: 'Modifier mon retour',
  Validé: 'Lire mon retour',
}

const time = (iso: string | null) => parseIso(iso)?.getTime() ?? 0

function detail(classTitle: string, startAt: string | null): string {
  const start = parseIso(startAt)
  return [classTitle, start ? formatCompactDay(start) : null].filter(Boolean).join(' · ')
}

function RowList({ title, rows }: { title: FeedbackStep; rows: readonly Row[] }) {
  if (rows.length === 0) return null
  return (
    <section aria-label={title} className="flex flex-col gap-2.5">
      <h2 className="text-xl">
        {title} · {rows.length}
      </h2>
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <li key={row.meetingId} className="flex flex-wrap items-center gap-3 rounded-[18px] border-2 border-line bg-surface px-4 py-3">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-black">{row.name}</span>
              <span className="text-[13px] font-bold text-muted">{row.detail}</span>
            </span>
            <StepBadge step={row.step} />
            <Link
              to={feedbackFormPath('school', row.meetingId)}
              className={
                row.step === 'À rédiger'
                  ? 'inline-flex min-h-touch items-center rounded-[12px] bg-terra px-4 text-sm font-black text-white'
                  : 'inline-flex min-h-touch items-center text-sm font-black text-indigo underline underline-offset-2'
              }
            >
              {ACTION[row.step]}
              {' '}
              <span className="sr-only">: {row.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** `/ecole/retours` (sans maquette, décision 96) : « À rédiger » d'abord, puis « Soumis » et « Validé ». */
export function SchoolFeedbacksPage() {
  const awaiting = useAwaitingFeedbacks('school')
  const written = useWrittenFeedbacks('school')
  const meetings = useSchoolMeetings()

  const header = (
    <PageTitle
      kicker="Vos rencontres racontées"
      title="Retours d'expérience"
      subtitle="Après chaque rencontre, racontez ce que vos élèves et vous avez vécu. Une fois validés par la Fondation M, vos récits rejoignent le rapport d’impact des donateurs."
    />
  )
  if (awaiting.isPending || written.isPending) {
    return (
      <div className="flex flex-col gap-4">
        {header}
        <div className="flex justify-center py-10 text-terra">
          <Spinner label="Chargement des retours…" size="lg" />
        </div>
      </div>
    )
  }
  if (awaiting.isError || written.isError) {
    const failed = awaiting.isError ? awaiting : written
    return (
      <div className="flex flex-col gap-4">
        {header}
        <ErrorState message={errorMessage(failed.error)} onRetry={() => void failed.refetch()} retrying={failed.isFetching} />
      </div>
    )
  }

  const byId = new Map((meetings.data?.items ?? []).map((meeting) => [meeting.id, meeting]))
  const toWrite: Row[] = awaiting.data.items.map((entry) => ({
    meetingId: entry.meetingId,
    name: entry.partnerName ?? byId.get(entry.meetingId)?.speakerName ?? 'Intervenant',
    detail: detail(entry.classTitle || (byId.get(entry.meetingId)?.classTitle ?? ''), entry.startAt),
    startAt: entry.startAt,
    step: 'À rédiger',
  }))
  const writtenRows: Row[] = written.data.items.map((feedback) => {
    const meeting = byId.get(feedback.meetingId)
    return {
      meetingId: feedback.meetingId,
      name: meeting?.speakerName ?? 'Intervenant',
      detail: detail(meeting?.classTitle ?? '', feedback.startAt ?? meeting?.startAt ?? null),
      startAt: feedback.startAt,
      step: feedback.status === 'PUBLISHED' ? 'Validé' : 'Soumis',
    }
  })
  const sorted = (rows: Row[]) => rows.toSorted((a, b) => time(b.startAt) - time(a.startAt))
  const truncated = awaiting.data.truncated || written.data.truncated

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      {header}
      {truncated && <Alert tone="warning">Tous les retours n'ont pas pu être chargés.</Alert>}
      {toWrite.length + writtenRows.length === 0 ? (
        <p className="rounded-[18px] bg-surface p-4 font-bold text-muted">
          Aucune rencontre réalisée pour l’instant. Votre retour pourra s’écrire dès que la Fondation M aura marqué une rencontre comme réalisée.
        </p>
      ) : (
        <>
          <RowList title="À rédiger" rows={sorted(toWrite)} />
          <RowList title="Soumis" rows={sorted(writtenRows.filter((row) => row.step === 'Soumis'))} />
          <RowList title="Validé" rows={sorted(writtenRows.filter((row) => row.step === 'Validé'))} />
        </>
      )}
    </div>
  )
}
