import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { errorMessage } from '../../api/errors'
import { useCurrentUser } from '../../auth/currentUserContext'
import { PageTitle } from '../../components/layout/PageTitle'
import { BackIcon } from '../../components/layout/icons'
import { Alert } from '../../components/ui/Alert'
import { ErrorState } from '../../components/ui/ErrorState'
import { Spinner } from '../../components/ui/Spinner'
import { cn } from '../../lib/cn'
import { formatTime, formatTimeRange, parseIso } from '../../lib/dateTime'
import { initialsOf } from '../../lib/initials'
import { useNow } from '../../lib/useNow'
import { placeLabel } from '../school/meetingText'
import { useStudentMeetings, type StudentMeeting } from './studentData'
import { dayBlock, defaultMeeting, detailDate, greetingSentence, infoBox, relativeLabel, splitMeetings } from './studentModel'

interface DetailState {
  fromList?: boolean
}

const NO_CLASS = 'Ton compte n’est rattaché à aucune classe pour l’instant. Parles-en à ton référent orientation.'

function MeetingRows({ meetings, selectedId, now, onSelect }: { meetings: readonly StudentMeeting[]; selectedId: string | null; now: Date; onSelect: (meeting: StudentMeeting) => void }) {
  return (
    <ul className="flex flex-col gap-2">
      {meetings.map((meeting) => {
        const block = dayBlock(meeting)
        const start = parseIso(meeting.startAt)
        const selected = meeting.id === selectedId
        const completed = meeting.status === 'COMPLETED'
        return (
          <li key={meeting.id}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(meeting)}
              className={cn(
                'flex w-full items-center gap-3 rounded-[18px] border-2 bg-surface px-3.5 py-3 text-left',
                // Bordure encre (le jaune de la maquette fait 2,14:1 sur blanc, sous le seuil de 3:1).
                selected ? 'border-ink' : 'border-transparent hover:border-line',
              )}
            >
              <span className="flex w-12 shrink-0 flex-col items-center rounded-[12px] bg-canvas py-1.5" aria-hidden="true">
                <span className="font-display text-xl leading-none text-ink">{block.day}</span>
                <span className="text-[11px] font-black text-muted">{block.month}</span>
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-black text-ink">{meeting.speakerName}</span>
                <span className="text-[13px] font-bold text-muted">
                  {[meeting.jobTitle, completed || start === null ? null : formatTime(start)].filter(Boolean).join(' · ')}
                </span>
              </span>
              <span className={cn('shrink-0 rounded-pill px-2.5 py-1 text-xs font-black text-ink', completed ? 'bg-[#EDE6D6]' : 'bg-yellow')}>
                {relativeLabel(meeting, now)}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function MeetingDetail({ meeting, now }: { meeting: StudentMeeting; now: Date }) {
  const start = parseIso(meeting.startAt)
  const end = parseIso(meeting.endAt)
  const completed = meeting.status === 'COMPLETED'
  const box = infoBox(meeting, now)
  const hours = start && end ? formatTimeRange(start, end) : start ? formatTime(start) : null
  const where = [meeting.jobTitle, [meeting.city, meeting.country].filter(Boolean).join(', ')].filter(Boolean).join(' · ')
  return (
    <article aria-label={`Rencontre avec ${meeting.speakerName}`} className="flex flex-col overflow-hidden rounded-[22px] bg-surface">
      <div className={cn('flex flex-col gap-1.5 px-5 py-4 text-cream', completed ? 'bg-indigo' : 'bg-ink')}>
        <span className={cn('self-start rounded-pill px-2.5 py-1 text-xs font-black text-ink', completed ? 'bg-cream' : 'bg-yellow')}>
          {completed ? 'Réalisée' : 'Confirmée'}
        </span>
        <p className="font-display text-xl leading-tight">{detailDate(meeting, now)}</p>
        <p className="text-sm font-bold">{[hours, placeLabel(meeting)].filter(Boolean).join(' · ')}</p>
      </div>
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="inline-flex size-14 shrink-0 items-center justify-center rounded-[16px] bg-yellow font-display text-xl text-ink">
            {initialsOf(meeting.speakerName)}
          </span>
          <span className="flex min-w-0 flex-col">
            <h2 className="text-[24px] leading-tight">{meeting.speakerName}</h2>
            {where && <span className="text-sm font-bold text-muted">{where}</span>}
            {meeting.organization && <span className="text-sm font-bold text-muted">{meeting.organization}</span>}
          </span>
        </div>
        {meeting.skills.length > 0 && (
          <section aria-label="Ses compétences" className="flex flex-col gap-2">
            <h3 className="font-sans text-xs font-black uppercase tracking-[0.08em] text-muted">Ses compétences</h3>
            <ul className="flex flex-wrap gap-1.5">
              {meeting.skills.map((skill) => (
                <li key={skill} className="rounded-pill bg-canvas px-3 py-1 text-[13px] font-extrabold text-ink">
                  {skill}
                </li>
              ))}
            </ul>
          </section>
        )}
        <section aria-label={box.title} className="flex flex-col gap-1 rounded-[16px] bg-cream px-4 py-3">
          <h3 className="font-sans text-sm font-black text-ink">{box.title}</h3>
          <p className="text-sm font-semibold text-ink">{box.text}</p>
        </section>
        <p className="text-[13px] font-bold text-muted">Pas de contact direct avec l'intervenant : tout passe par ton établissement et la Fondation M.</p>
      </div>
    </article>
  )
}

/**
 * « Mon espace » de l'élève (maquette W5-E19 ; mobile déduit) : « À venir » et « Déjà vécues », détail à droite,
 * lecture seule. URL : `?rencontre={id}`.
 */
export function StudentHomePage() {
  const user = useCurrentUser()
  const now = useNow()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const meetings = useStudentMeetings()
  const details = user.details?.kind === 'student' ? user.details : null
  const firstName = details?.firstName ?? ''
  const noClass = details === null || details.classId === null

  const items = meetings.data?.items ?? []
  const lists = splitMeetings(items, now)
  const selectedId = params.get('rencontre')
  const explicit = selectedId === null ? undefined : items.find((meeting) => meeting.id === selectedId)
  const current = explicit ?? defaultMeeting(items, now)
  const detailOpen = explicit !== undefined
  const empty = meetings.data !== undefined && items.length === 0

  function select(meeting: StudentMeeting) {
    const next = new URLSearchParams(params)
    next.set('rencontre', meeting.id)
    setParams(next, { state: { fromList: true } satisfies DetailState })
  }

  function back() {
    const state = location.state as DetailState | null
    if (state?.fromList === true) {
      void navigate(-1)
      return
    }
    const next = new URLSearchParams(params)
    next.delete('rencontre')
    setParams(next, { replace: true })
  }

  const sentence = meetings.data === undefined ? undefined : empty && noClass ? NO_CLASS : greetingSentence(lists, now)

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <PageTitle
        className={cn(detailOpen && 'hidden lg:flex')}
        kicker="Mon espace"
        title={firstName ? `Salut ${firstName} !` : 'Salut !'}
        subtitle={sentence}
        mobileSubtitle={sentence}
      />

      {meetings.isPending ? (
        <div className="flex justify-center py-10 text-terra">
          <Spinner label="Chargement des rencontres…" size="lg" />
        </div>
      ) : meetings.isError ? (
        <ErrorState message={errorMessage(meetings.error)} onRetry={() => void meetings.refetch()} retrying={meetings.isFetching} />
      ) : (
        <div className="flex flex-col gap-4">
          {meetings.data.truncated && <Alert tone="warning">Toutes les rencontres n'ont pas pu être chargées.</Alert>}
          <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
            <div className={cn('flex flex-col gap-5', detailOpen && 'hidden lg:flex')}>
              <section aria-labelledby="a-venir" className="flex flex-col gap-2.5">
                <h2 id="a-venir" className="text-xl">
                  À venir
                </h2>
                {lists.upcoming.length === 0 ? (
                  <p className="rounded-[18px] bg-surface p-4 text-sm font-bold text-muted">
                    {empty && noClass ? NO_CLASS : 'Les prochaines rencontres apparaîtront ici dès qu’elles seront confirmées.'}
                  </p>
                ) : (
                  <MeetingRows meetings={lists.upcoming} selectedId={current?.id ?? null} now={now} onSelect={select} />
                )}
              </section>
              {lists.past.length > 0 && (
                <section aria-labelledby="deja-vecues" className="flex flex-col gap-2.5">
                  <h2 id="deja-vecues" className="text-xl">
                    Déjà vécues
                  </h2>
                  <MeetingRows meetings={lists.past} selectedId={current?.id ?? null} now={now} onSelect={select} />
                </section>
              )}
              <aside aria-label="Bon à savoir" className="flex flex-col gap-1 rounded-[16px] bg-cream px-4 py-3 text-sm font-semibold text-ink">
                <h2 className="font-sans text-sm font-black">Bon à savoir</h2>
                <p>Ici, tu consultes seulement. Une question pour un intervenant ? Pose-la pendant la rencontre ou passe par ton référent orientation.</p>
                <p>Si une rencontre est annulée, elle n'apparaît plus ici.</p>
              </aside>
            </div>
            {current && (
              <section aria-label="Rencontre choisie" aria-live="polite" className={cn('flex flex-col gap-3', !detailOpen && 'hidden lg:flex')}>
                <button type="button" onClick={back} className="inline-flex min-h-touch items-center gap-1 self-start text-sm font-black text-ink lg:hidden">
                  <BackIcon className="size-5" />
                  Retour à la liste
                </button>
                <MeetingDetail key={current.id} meeting={current} now={now} />
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
