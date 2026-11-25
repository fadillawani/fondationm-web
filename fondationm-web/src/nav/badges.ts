import type { Role } from '../auth/currentUser'
import { navItemsFor, type NavBadge } from '../auth/roles'
import { usePendingTotal } from '../pages/foundation/accounts'
import { useOpenDonorRequestCount } from '../pages/foundation/donors/donorRequestCount'
import { useFeedbacksToValidateCount } from '../pages/foundation/feedbacks/foundationFeedbacksData'
import { useFoundationMeetingCounts } from '../pages/foundation/meetings/foundationMeetingCounts'
import { useUpcomingMeetingsCount } from '../pages/school/meetingsData'
import { usePendingRequestCount } from '../pages/speaker/speakerData'

/** Compteurs de la navigation, chargés seulement pour le rôle qui les affiche. */
export function useNavBadges(role: Role): Record<NavBadge, number | undefined> {
  const badges = new Set(navItemsFor(role).flatMap((item) => item.badge ?? []))
  const foundation = useFoundationMeetingCounts(badges.has('awaitingFoundation') || badges.has('meetingsToMark'))
  return {
    pendingAccounts: usePendingTotal(badges.has('pendingAccounts')),
    pendingRequests: usePendingRequestCount(badges.has('pendingRequests')),
    upcomingMeetings: useUpcomingMeetingsCount(badges.has('upcomingMeetings')),
    awaitingFoundation: foundation.awaiting,
    meetingsToMark: foundation.toMark,
    openDonorRequests: useOpenDonorRequestCount(badges.has('openDonorRequests')),
    feedbacksToValidate: useFeedbacksToValidateCount(badges.has('feedbacksToValidate')),
  }
}
