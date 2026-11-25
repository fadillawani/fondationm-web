import { formatDay, formatDayMonth, parseIso } from '../../lib/dateTime'
import type { DonorFeedback, DonorImpact, DonorRequest } from './donorData'

export const SUBJECT_MAX = 150
export const MESSAGE_MAX = 2000

const time = (iso: string | null) => parseIso(iso)?.getTime() ?? 0

/** Compteurs : « 0 » est exact selon le contrat ; « — » seulement pour un champ absent ou null (décision 101). */
export function countText(value: number | null): string {
  return value === null ? '—' : value.toLocaleString('fr-FR')
}

/** « 4,6 / 5 », ou « — » sans note. */
export function ratingText(value: number | null): string {
  return value === null ? '—' : `${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} / 5`
}

/** « écoles 4,5 · intervenants 4 » : seulement les parts qui existent (la note école est absente depuis F9). */
export function ratingDetail(rating: DonorImpact['rating']): string | null {
  const parts = [
    rating.school === null ? null : `écoles ${rating.school.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}`,
    rating.speaker === null ? null : `intervenants ${rating.speaker.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}`,
  ].filter((part): part is string => part !== null)
  return parts.length === 0 ? null : parts.join(' · ')
}

export type FeedbackFilter = 'tous' | 'ecoles' | 'intervenants'
export const FEEDBACK_FILTERS: readonly FeedbackFilter[] = ['tous', 'ecoles', 'intervenants']
export const FEEDBACK_FILTER_LABEL: Record<FeedbackFilter, string> = { tous: 'Tous', ecoles: 'Écoles', intervenants: 'Intervenants' }

export function matchesFilter(feedback: DonorFeedback, filter: FeedbackFilter): boolean {
  if (filter === 'tous') return true
  return filter === 'ecoles' ? feedback.authorRole === 'SCHOOL' : feedback.authorRole === 'SPEAKER'
}

/** Date de rencontre décroissante, puis date de publication, puis identifiant (décision 102). */
export function sortFeedbacks(feedbacks: readonly DonorFeedback[]): DonorFeedback[] {
  return feedbacks.toSorted(
    (a, b) => time(b.meetingStartAt) - time(a.meetingStartAt) || time(b.publishedAt) - time(a.publishedAt) || a.id.localeCompare(b.id),
  )
}

export function authorLabel(feedback: DonorFeedback): string {
  return feedback.authorRole === 'SCHOOL' ? 'Avis de l’école' : 'Avis de l’intervenant'
}

export function placeText(feedback: DonorFeedback): string {
  return [feedback.schoolCity, feedback.schoolCountry].filter(Boolean).join(', ')
}

export function meetingDay(feedback: DonorFeedback): string {
  const start = parseIso(feedback.meetingStartAt)
  return start ? formatDay(start) : 'Date inconnue'
}

/** Coupe à `max` caractères, « … » compris. */
export function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`
}

/** Début de citation d'une carte de la liste (environ 90 caractères). */
export function excerpt(quote: string | null): string | null {
  return quote === null ? null : truncate(quote.replace(/\s+/g, ' ').trim(), 90)
}

/** Objet prérempli d'une question sur un retour : « Retour du 20 octobre à Pikine » (150 caractères au plus). */
export function feedbackSubject(feedback: DonorFeedback): string {
  const start = parseIso(feedback.meetingStartAt)
  const day = start ? ` du ${formatDayMonth(start)}` : ''
  const city = feedback.schoolCity ? ` à ${feedback.schoolCity}` : ''
  return truncate(`Retour${day}${city}`, SUBJECT_MAX)
}

/** Objet d'un complément : « Complément : {objet} » (150 caractères au plus). */
export function followUpSubject(request: DonorRequest): string {
  return truncate(`Complément : ${request.subject}`, SUBJECT_MAX)
}

/** Requêtes, la plus récente d'abord (tri du serveur non documenté). */
export function sortRequests(requests: readonly DonorRequest[]): DonorRequest[] {
  return requests.toSorted((a, b) => time(b.createdAt) - time(a.createdAt) || a.id.localeCompare(b.id))
}

export type RequestStep = 'Envoyée' | 'Traitée'

export function requestStep(request: DonorRequest): RequestStep {
  return request.status === 'ANSWERED' ? 'Traitée' : 'Envoyée'
}

/** Encre sur orange 5,71:1 (blanc : 2,82:1, échec) ; blanc sur vert 6,14:1. */
export const STEP_LOOK: Record<RequestStep, string> = {
  Envoyée: 'bg-orange text-ink',
  Traitée: 'bg-green text-white',
}

export const STEP_HINT: Record<RequestStep, string> = {
  Envoyée: 'En attente de réponse',
  Traitée: 'Réponse reçue',
}

/** « 12 nov » (liste des requêtes). */
export function shortDate(iso: string | null): string | null {
  const date = parseIso(iso)
  return date ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date).replace('.', '') : null
}

/**
 * Après un échec d'envoi : la requête relue n'est retenue que si objet ET message sont identiques ET qu'elle a été créée
 * après le début de l'envoi (décision 104). Sinon, rien n'est retenu.
 */
export function findSentDuplicate(requests: readonly DonorRequest[], sent: { subject: string; message: string }, startedAt: Date): DonorRequest | null {
  return (
    requests.find((request) => {
      const created = parseIso(request.createdAt)
      return request.subject === sent.subject && request.message === sent.message && created !== null && created.getTime() >= startedAt.getTime()
    }) ?? null
  )
}
