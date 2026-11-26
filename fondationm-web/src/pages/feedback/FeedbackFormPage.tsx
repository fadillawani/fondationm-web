import { Link, useParams } from 'react-router'
import { errorMessage } from '../../api/errors'
import { useCurrentUser } from '../../auth/currentUserContext'
import { PATHS } from '../../auth/roles'
import { PageTitle } from '../../components/layout/PageTitle'
import { ErrorState } from '../../components/ui/ErrorState'
import { Spinner } from '../../components/ui/Spinner'
import { parseIso } from '../../lib/dateTime'
import { placeLabel } from '../school/meetingText'
import { useSchoolMeetings, type SchoolMeeting } from '../school/meetingsData'
import { useMeetings, type Meeting } from '../speaker/speakerData'
import { MEETING_FORMAT_LABEL } from '../speaker/speakerText'
import { useAwaitingFeedbacks, useWrittenFeedbacks, type AwaitingFeedback, type MyFeedback } from './feedbackData'
import { FeedbackEditor, type FeedbackMeetingContext, type OtherFeedback } from './FeedbackEditor'
import { stepOf, type FeedbackRole } from './feedbackText'

/** Rencontre ramenée à ce dont le formulaire a besoin. */
interface MeetingSummary {
  id: string
  completed: boolean
  context: FeedbackMeetingContext
}

function fromSchoolMeeting(meeting: SchoolMeeting): MeetingSummary {
  return {
    id: meeting.id,
    completed: meeting.status === 'COMPLETED',
    context: {
      meetingId: meeting.id,
      partnerName: meeting.speakerName,
      partnerDetail: meeting.speakerCity,
      partnerPhotoUrl: meeting.speakerPhotoUrl,
      partnerPhotoKind: 'photo',
      classTitle: meeting.classTitle,
      studentCount: meeting.studentCount,
      startAt: meeting.startAt,
      endAt: meeting.endAt,
      place: placeLabel(meeting),
    },
  }
}

function fromSpeakerMeeting(meeting: Meeting): MeetingSummary {
  return {
    id: meeting.id,
    completed: meeting.status === 'COMPLETED',
    context: {
      meetingId: meeting.id,
      partnerName: meeting.schoolName,
      partnerDetail: meeting.schoolCity,
      partnerPhotoUrl: meeting.schoolPhotoUrl,
      partnerPhotoKind: 'logo',
      classTitle: meeting.classTitle,
      studentCount: meeting.studentCount,
      startAt: meeting.slot?.startAt ?? null,
      endAt: meeting.slot?.endAt ?? null,
      place: [meeting.format ? MEETING_FORMAT_LABEL[meeting.format] : null, meeting.place].filter(Boolean).join(' · ') || null,
    },
  }
}

function fallbackContext(role: FeedbackRole, meetingId: string, awaiting: AwaitingFeedback | undefined, written: MyFeedback | undefined): FeedbackMeetingContext {
  return {
    meetingId,
    partnerName: awaiting?.partnerName ?? (role === 'school' ? 'l’intervenant' : 'l’établissement'),
    partnerDetail: awaiting?.partnerCity ?? '',
    partnerPhotoKind: role === 'school' ? 'photo' : 'logo',
    classTitle: awaiting?.classTitle ?? '',
    studentCount: awaiting?.studentCount ?? null,
    startAt: awaiting?.startAt ?? written?.startAt ?? null,
    endAt: awaiting?.endAt ?? written?.endAt ?? null,
    place: null,
  }
}

const time = (iso: string | null) => parseIso(iso)?.getTime() ?? 0

function Message({ role, title, text }: { role: FeedbackRole; title: string; text: string }) {
  const back = role === 'school' ? { to: PATHS.schoolFeedbacks, label: 'Voir mes retours d’expérience' } : { to: PATHS.speakerImpact, label: 'Revenir à Mon impact' }
  return (
    <div className="flex flex-col gap-4">
      <PageTitle title="Retour d'expérience" />
      <section className="flex flex-col items-start gap-3 rounded-[20px] border-2 border-line bg-surface p-5">
        <h2 className="text-2xl">{title}</h2>
        <p className="font-semibold">{text}</p>
        <Link to={back.to} className="inline-flex min-h-touch items-center text-sm font-black text-indigo underline underline-offset-2">
          {back.label}
        </Link>
      </section>
    </div>
  )
}

interface FeedbackPageBodyProps {
  author: FeedbackRole
  meetings: { isPending: boolean; items: readonly MeetingSummary[] }
}

function FeedbackPageBody({ author: role, meetings }: FeedbackPageBodyProps) {
  const { meetingId = '' } = useParams()
  const user = useCurrentUser()
  const written = useWrittenFeedbacks(role)
  const awaiting = useAwaitingFeedbacks(role)

  if (written.isPending || awaiting.isPending || meetings.isPending) {
    return (
      <div className="flex justify-center py-10 text-terra">
        <Spinner label="Chargement du retour…" size="lg" />
      </div>
    )
  }
  if (written.isError || awaiting.isError) {
    const failed = written.isError ? written : awaiting
    return <ErrorState message={errorMessage(failed.error)} onRetry={() => void failed.refetch()} retrying={failed.isFetching} />
  }

  const existing = written.data.items.find((feedback) => feedback.meetingId === meetingId)
  const toWrite = awaiting.data.items.find((entry) => entry.meetingId === meetingId)
  const meeting = meetings.items.find((entry) => entry.id === meetingId)
  if (existing === undefined && toWrite === undefined) {
    if (meeting === undefined) {
      return <Message role={role} title="Rencontre introuvable" text="Cette rencontre n’existe pas ou ne vous concerne pas." />
    }
    if (!meeting.completed) {
      return (
        <Message
          role={role}
          title="Pas encore de retour possible"
          text="Le retour d’expérience s’écrit une fois la rencontre réalisée et marquée comme telle par la Fondation M."
        />
      )
    }
  }

  const names = new Map(meetings.items.map((entry) => [entry.id, entry.context.partnerName]))
  const others: OtherFeedback[] = written.data.items
    .filter((feedback) => feedback.meetingId !== meetingId)
    .toSorted((a, b) => time(b.startAt) - time(a.startAt))
    .slice(0, 5)
    .map((feedback) => ({
      meetingId: feedback.meetingId,
      name: names.get(feedback.meetingId) ?? (role === 'school' ? 'Intervenant' : 'Établissement'),
      startAt: feedback.startAt,
      step: stepOf(feedback.status),
    }))

  return (
    <FeedbackEditor
      key={meetingId}
      role={role}
      userId={user.id}
      context={meeting?.context ?? fallbackContext(role, meetingId, toWrite, existing)}
      existing={existing ?? null}
      others={others}
    />
  )
}

/** `/ecole/retours/:meetingId` (maquette W1-E6). */
export function SchoolFeedbackPage() {
  const meetings = useSchoolMeetings()
  // Une erreur sur les rencontres n'empêche pas d'écrire : l'en-tête se rabat sur la liste « à rédiger ».
  return <FeedbackPageBody author="school" meetings={{ isPending: meetings.isPending, items: (meetings.data?.items ?? []).map(fromSchoolMeeting) }} />
}

/** `/intervenant/retours/:meetingId` (maquette W2-E10). */
export function SpeakerFeedbackPage() {
  const meetings = useMeetings()
  return <FeedbackPageBody author="speaker" meetings={{ isPending: meetings.isPending, items: (meetings.data?.items ?? []).map(fromSpeakerMeeting) }} />
}
