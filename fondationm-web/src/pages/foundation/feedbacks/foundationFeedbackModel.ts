import { parseIso } from '../../../lib/dateTime'
import { stepOf, type FeedbackStep } from '../../feedback/feedbackText'
import type { FoundationFeedback } from './foundationFeedbacksData'

/** Une rencontre et ses deux retours possibles (jointure par `meeting.id`, décision 95). */
export interface MeetingFeedbackPair {
  meetingId: string
  startAt: string | null
  schoolName: string
  schoolCity: string
  classTitle: string
  speakerName: string
  school: FoundationFeedback | null
  speaker: FoundationFeedback | null
}

const time = (iso: string | null) => parseIso(iso)?.getTime() ?? 0

/** Deux retours du même auteur sur une rencontre (non prévu) : le plus récemment modifié l'emporte. */
function newer(current: FoundationFeedback | null, candidate: FoundationFeedback): FoundationFeedback {
  return current === null || time(candidate.updatedAt) >= time(current.updatedAt) ? candidate : current
}

/** Regroupe les retours par rencontre, la plus récente d'abord. */
export function pairByMeeting(feedbacks: readonly FoundationFeedback[]): MeetingFeedbackPair[] {
  const pairs = new Map<string, MeetingFeedbackPair>()
  for (const feedback of feedbacks) {
    const pair = pairs.get(feedback.meetingId) ?? {
      meetingId: feedback.meetingId,
      startAt: feedback.startAt,
      schoolName: feedback.schoolName,
      schoolCity: feedback.schoolCity,
      classTitle: feedback.classTitle,
      speakerName: feedback.speakerName,
      school: null,
      speaker: null,
    }
    if (feedback.authorRole === 'SCHOOL') pair.school = newer(pair.school, feedback)
    else pair.speaker = newer(pair.speaker, feedback)
    pairs.set(feedback.meetingId, pair)
  }
  return [...pairs.values()].toSorted((a, b) => time(b.startAt) - time(a.startAt))
}

export function pairSteps(pair: MeetingFeedbackPair): { school: FeedbackStep; speaker: FeedbackStep } {
  return { school: stepOf(pair.school?.status ?? null), speaker: stepOf(pair.speaker?.status ?? null) }
}

export type FeedbackTab = 'a-valider' | 'valides' | 'tous'
export const FEEDBACK_TABS: readonly FeedbackTab[] = ['a-valider', 'valides', 'tous']

export function hasSubmitted(pair: MeetingFeedbackPair): boolean {
  return pair.school?.status === 'SUBMITTED' || pair.speaker?.status === 'SUBMITTED'
}

/** Onglets de la maquette : « À valider » = au moins un retour SUBMITTED ; « Validés » = les autres. */
export function inTab(pair: MeetingFeedbackPair, tab: FeedbackTab): boolean {
  if (tab === 'tous') return true
  return tab === 'a-valider' ? hasSubmitted(pair) : !hasSubmitted(pair)
}

/** « À valider · N » : nombre de retours SUBMITTED, comme la pastille de navigation. */
export function submittedCount(feedbacks: readonly FoundationFeedback[]): number {
  return feedbacks.filter((feedback) => feedback.status === 'SUBMITTED').length
}

/** Titre de la rencontre (maquette) : « Lycée de Sor × Aïssatou Diop ». */
export function pairTitle(pair: MeetingFeedbackPair): string {
  return `${pair.schoolName} × ${pair.speakerName}`
}
