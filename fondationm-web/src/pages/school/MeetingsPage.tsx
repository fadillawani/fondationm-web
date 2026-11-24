import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router'
import { errorMessage } from '../../api/errors'
import { useCurrentUser } from '../../auth/currentUserContext'
import { PATHS } from '../../auth/roles'
import { PageTitle } from '../../components/layout/PageTitle'
import { PlusIcon } from '../../components/layout/icons'
import { Alert } from '../../components/ui/Alert'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { Spinner } from '../../components/ui/Spinner'
import { buttonClass } from '../../components/ui/styles'
import { monthParam, readMonthParam } from '../../lib/calendar'
import { cn } from '../../lib/cn'
import { parseIso } from '../../lib/dateTime'
import { useNow } from '../../lib/useNow'
import { FeedbackBanner, NextMeetingBanner } from './MeetingBanners'
import { MeetingDetail } from './MeetingDetail'
import { MeetingList } from './MeetingList'
import { CompactCalendar, MeetingsCalendar } from './MeetingsCalendar'
import { isUpcoming, useFeedbackStates, useSchoolMeetings, type SchoolMeeting } from './meetingsData'
import { groupMeetingsByDay } from './meetingText'
import { speakerDetailQuery } from './schoolData'

function byStart(a: SchoolMeeting, b: SchoolMeeting): number {
  return a.startAt.localeCompare(b.startAt)
}

/** Métier de l'intervenant (fiche de l'annuaire) ; omis si la fiche est introuvable (404). */
function useJobTitle(speakerId: string | null | undefined): string | null {
  const detail = useQuery({ ...speakerDetailQuery(speakerId ?? ''), enabled: Boolean(speakerId) })
  return detail.data?.jobTitle || null
}

export function MeetingsPage() {
  const user = useCurrentUser()
  const now = useNow()
  const [params, setParams] = useSearchParams()
  const meetings = useSchoolMeetings()
  const feedback = useFeedbackStates()

  const school = user.details?.kind === 'school' ? user.details : null
  const all = (meetings.data?.items ?? []).toSorted(byStart)
  const upcoming = all.filter((meeting) => isUpcoming(meeting, now))
  const past = all.filter((meeting) => !isUpcoming(meeting, now)).toReversed()

  const requested = params.get('rencontre')
  const fromUrl = requested === null ? undefined : all.find((meeting) => meeting.id === requested)
  const selected = fromUrl ?? upcoming[0] ?? past[0] ?? null
  // Sans « mois », le mois de la rencontre demandée (lien du bandeau de refus), sinon le mois courant.
  const month = readMonthParam(params.get('mois'), (fromUrl && parseIso(fromUrl.startAt)) || now)

  const next = upcoming.find((meeting) => meeting.status === 'CONFIRMED') ?? null
  const nextStart = next ? parseIso(next.startAt) : null
  const toShare = past.find((meeting) => meeting.status === 'COMPLETED' && feedback.get(meeting.id) === 'À rédiger') ?? null

  const selectedJob = useJobTitle(selected?.speakerId)
  const nextJob = useJobTitle(next?.speakerId)

  function update(changes: Record<string, string>) {
    const search = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) search.set(key, value)
    setParams(search, { replace: true })
  }

  function select(meeting: SchoolMeeting) {
    const start = parseIso(meeting.startAt)
    update({ rencontre: meeting.id, ...(start ? { mois: monthParam(start) } : {}) })
  }

  function changeMonth(delta: number) {
    update({ mois: monthParam(new Date(month.getFullYear(), month.getMonth() + delta, 1)) })
  }

  const byDay = groupMeetingsByDay(all)
  const calendarProps = { month, now, byDay, feedback, selectedId: selected?.id ?? null, onSelect: select, onMonth: changeMonth }

  return (
    <div className="flex flex-col gap-[18px]">
      <PageTitle
        kicker="Mon planning"
        mobileKicker={[school?.schoolName, school?.city].filter(Boolean).join(' · ') || 'Mon planning'}
        title="Mes rencontres"
        actions={
          <Link
            to={PATHS.schoolSpeakers}
            className="inline-flex min-h-[50px] items-center rounded-2xl bg-terra px-[22px] font-display text-lg text-white"
          >
            Nouvelle demande
          </Link>
        }
        mobileAction={
          <Link
            to={PATHS.schoolSpeakers}
            aria-label="Nouvelle demande"
            className="inline-flex size-12 items-center justify-center rounded-2xl bg-terra text-white"
          >
            <PlusIcon className="size-[22px]" />
          </Link>
        }
      />

      {meetings.data?.truncated && (
        <Alert tone="warning">Vous avez beaucoup de rencontres : toutes n'ont pas pu être affichées.</Alert>
      )}

      {next !== null && nextStart !== null && (
        <NextMeetingBanner meeting={next} start={nextStart} now={now} jobTitle={nextJob} onShow={() => select(next)} />
      )}
      {toShare !== null && <FeedbackBanner meeting={toShare} />}

      {meetings.isPending ? (
        <div className="flex justify-center py-10 text-terra">
          <Spinner label="Chargement de vos rencontres…" size="lg" />
        </div>
      ) : meetings.isError ? (
        <ErrorState
          message={errorMessage(meetings.error)}
          onRetry={() => void meetings.refetch()}
          retrying={meetings.isFetching}
        />
      ) : all.length === 0 ? (
        <EmptyState
          title="Aucune rencontre pour l'instant."
          description="Choisissez un intervenant pour envoyer votre première demande."
          action={
            <Link to={PATHS.schoolSpeakers} className={buttonClass('primary', { size: 'md' })}>
              Nouvelle demande
            </Link>
          }
        />
      ) : (
        <div className="grid items-start gap-3.5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-5">
          <div className="min-w-0">
            <div className="hidden lg:block">
              <MeetingsCalendar {...calendarProps} />
            </div>
            <div className="lg:hidden">
              <CompactCalendar {...calendarProps} />
            </div>
          </div>
          <div className={cn('flex min-w-0 flex-col gap-4')}>
            {selected !== null && (
              <MeetingDetail
                key={selected.id}
                meeting={selected}
                jobTitle={selectedJob}
                feedback={feedback.get(selected.id)}
                upcoming={isUpcoming(selected, now)}
              />
            )}
            <MeetingList title="À venir" meetings={upcoming} feedback={feedback} selectedId={selected?.id ?? null} onSelect={select} />
            <MeetingList
              title="Passées"
              meetings={past}
              feedback={feedback}
              selectedId={selected?.id ?? null}
              onSelect={select}
              collapsible
            />
          </div>
        </div>
      )}
    </div>
  )
}
