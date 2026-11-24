import type { Role } from '../auth/currentUser'
import { navItemsFor, type NavBadge } from '../auth/roles'
import { usePendingTotal } from '../pages/foundation/accounts'
import { usePendingRequestCount } from '../pages/speaker/speakerData'

/** Compteurs de la navigation, chargés seulement pour le rôle qui les affiche. */
export function useNavBadges(role: Role): Record<NavBadge, number | undefined> {
  const badges = new Set(navItemsFor(role).flatMap((item) => item.badge ?? []))
  return {
    pendingAccounts: usePendingTotal(badges.has('pendingAccounts')),
    pendingRequests: usePendingRequestCount(badges.has('pendingRequests')),
  }
}
