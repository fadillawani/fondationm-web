import { useNow } from '../../../lib/useNow'
import { useFoundationMeetings } from './foundationMeetingsData'
import { isAwaitingFoundation, isToMark } from './foundationMeetingState'

/**
 * Pastilles de la navigation Fondation (maquette) : « Demandes de rencontre » = à traiter, « Rencontres » = à
 * marquer. Même requête que les pages (toutes les rencontres) ; point ouvert : un compteur côté serveur.
 */
export function useFoundationMeetingCounts(enabled: boolean): { awaiting: number | undefined; toMark: number | undefined } {
  const now = useNow()
  const meetings = useFoundationMeetings(enabled)
  const items = meetings.data?.items
  return {
    awaiting: items?.filter(isAwaitingFoundation).length,
    toMark: items?.filter((meeting) => isToMark(meeting, now)).length,
  }
}
