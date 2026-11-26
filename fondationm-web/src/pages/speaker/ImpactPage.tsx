import { useState } from 'react'
import { Link } from 'react-router'
import { errorMessage } from '../../api/errors'
import { feedbackFormPath } from '../../auth/roles'
import { PageTitle } from '../../components/layout/PageTitle'
import { Alert } from '../../components/ui/Alert'
import { ErrorState } from '../../components/ui/ErrorState'
import { Spinner } from '../../components/ui/Spinner'
import { formatDay, parseIso } from '../../lib/dateTime'
import { useAwaitingFeedbacks, useWrittenFeedbacks, type MyFeedback } from '../feedback/feedbackData'
import { FeedbackContent } from '../feedback/FeedbackContent'
import { StepBadge } from '../feedback/FeedbackParts'
import { stepOf } from '../feedback/feedbackText'
import { useNow } from '../../lib/useNow'
import { EmotionsBlock, ImpactCards } from './ImpactSummary'
import { useMeetings, type Meeting } from './speakerData'
import { computeImpact, sinceLabel } from './speakerImpact'

const time = (iso: string | null) => parseIso(iso)?.getTime() ?? 0

function dayOf(iso: string | null): string | null {
  const start = parseIso(iso)
  return start ? formatDay(start) : null
}

function facts(classTitle: string, studentCount: number | null): string {
  return [classTitle, studentCount === null ? null : `${studentCount} élèves`].filter(Boolean).join(' · ')
}

function StoryCard({ feedback, meeting }: { feedback: MyFeedback; meeting: Meeting | undefined }) {
  const [open, setOpen] = useState(false)
  const step = stepOf(feedback.status)
  const school = meeting?.schoolName ?? 'Établissement'
  const detailId = `recit-${feedback.id}`
  return (
    <li className="flex flex-col gap-3 rounded-[20px] border-2 border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="flex flex-col">
          <span className="text-xs font-black uppercase text-muted">{dayOf(feedback.startAt) ?? 'Date inconnue'}</span>
          <span className="font-black">{school}</span>
          {meeting && facts(meeting.classTitle, meeting.studentCount) && (
            <span className="text-[13px] font-bold text-muted">{facts(meeting.classTitle, meeting.studentCount)}</span>
          )}
        </span>
        <StepBadge step={step} />
      </div>
      <div id={detailId}>
        <FeedbackContent comment={feedback.comment} rating={feedback.rating} stories={open ? undefined : ['moment']} />
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={detailId}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex min-h-touch items-center text-sm font-black text-indigo underline underline-offset-2"
        >
          {open ? 'Replier mon récit' : 'Lire tout mon récit'}
        </button>
        {step === 'Soumis' && (
          <Link to={feedbackFormPath('speaker', feedback.meetingId)} className="inline-flex min-h-touch items-center text-sm font-black text-ink underline underline-offset-2">
            Modifier mon récit{' '}
            <span className="sr-only">: {school}</span>
          </Link>
        )}
      </div>
    </li>
  )
}

/** « Mes retours d'expérience » (F9), inchangé : rencontres à raconter et récits repliés. */
function MyStories() {
  const awaiting = useAwaitingFeedbacks('speaker')
  const written = useWrittenFeedbacks('speaker')
  const meetings = useMeetings()

  if (awaiting.isPending || written.isPending) {
    return (
      <div className="flex justify-center py-10 text-terra">
        <Spinner label="Chargement de vos retours…" size="lg" />
      </div>
    )
  }
  if (awaiting.isError || written.isError) {
    const failed = awaiting.isError ? awaiting : written
    return <ErrorState message={errorMessage(failed.error)} onRetry={() => void failed.refetch()} retrying={failed.isFetching} />
  }

  const byId = new Map((meetings.data?.items ?? []).map((meeting) => [meeting.id, meeting]))
  const toWrite = awaiting.data.items.toSorted((a, b) => time(b.startAt) - time(a.startAt))
  const stories = written.data.items.toSorted((a, b) => time(b.startAt) - time(a.startAt))

  return (
    <>
      {(awaiting.data.truncated || written.data.truncated) && <Alert tone="warning">Tous vos retours n'ont pas pu être chargés.</Alert>}
      {toWrite.length + stories.length === 0 && (
        <p className="rounded-[18px] bg-surface p-4 font-bold text-muted">
          Aucune rencontre réalisée pour l’instant. Vous pourrez la raconter dès que la Fondation M l’aura marquée comme réalisée.
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {toWrite.map((entry) => {
          const school = entry.partnerName ?? byId.get(entry.meetingId)?.schoolName ?? 'Établissement'
          return (
            <li key={entry.meetingId} className="flex flex-col gap-2 rounded-[20px] border-2 border-yellow bg-cream p-4 lg:flex-row lg:items-center lg:gap-4">
              <span className="flex flex-1 flex-col">
                <span className="text-xs font-black uppercase text-[#7A4100]">
                  {dayOf(entry.startAt) ?? 'Date inconnue'} · À rédiger
                </span>
                <span className="font-black">{[school, entry.classTitle].filter(Boolean).join(' · ')}</span>
                {entry.studentCount !== null && <span className="text-[13px] font-bold text-ink">{entry.studentCount} élèves</span>}
              </span>
              <Link
                to={feedbackFormPath('speaker', entry.meetingId)}
                className="inline-flex min-h-touch items-center justify-center rounded-[14px] bg-terra px-4 text-sm font-black text-white"
              >
                Raconter cette rencontre{' '}
                <span className="sr-only">: {school}</span>
              </Link>
            </li>
          )
        })}
        {stories.map((feedback) => (
          <StoryCard key={feedback.id} feedback={feedback} meeting={byId.get(feedback.meetingId)} />
        ))}
      </ul>
    </>
  )
}

/**
 * « Mon impact » (maquette W2-impact) : indicateurs calculés côté client (F12, décision 120), « Ce que vous avez
 * ressenti », puis « Mes retours d'expérience » (F9). Chaque bloc a son chargement et son erreur.
 */
export function ImpactPage() {
  const now = useNow()
  const meetings = useMeetings()
  const since = meetings.data === undefined ? null : sinceLabel(computeImpact(meetings.data.items, now).firstStart)

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <PageTitle kicker={since ?? undefined} title="Mon impact" subtitle="Ce que vous avez transmis, et ce que ces rencontres vous ont laissé." />
      <section aria-label="Mes chiffres">
        <ImpactCards />
      </section>
      <section aria-labelledby="ressenti" className="flex flex-col gap-2.5">
        <h2 id="ressenti" className="text-2xl">
          Ce que vous avez ressenti
        </h2>
        <EmotionsBlock />
      </section>
      <section aria-labelledby="mes-retours" className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 id="mes-retours" className="text-2xl">
            Mes retours d'expérience
          </h2>
          <p className="text-sm font-bold text-muted">Une rencontre, une histoire</p>
        </div>
        <MyStories />
        <p className="text-[13px] font-bold text-muted">Vos retours validés par la Fondation M rejoignent le rapport d’impact lu par les donateurs.</p>
      </section>
    </div>
  )
}
