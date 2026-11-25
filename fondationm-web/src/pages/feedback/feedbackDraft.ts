import { asRecord, textList } from '../../api/wire'
import type { FeedbackValues } from './feedbackForm'

/*
 * Brouillon « Finir plus tard » (décision 91) : sessionStorage, par compte et par rencontre. Il ne survit pas à la
 * fermeture de l'onglet (ordinateurs partagés des écoles) et il est effacé à l'envoi et à la déconnexion.
 * Seules les valeurs du formulaire y sont gardées : jamais de jeton ni d'identifiant de connexion.
 */
const PREFIX = 'fondationm.retour.'

function keyOf(userId: string, meetingId: string): string {
  return `${PREFIX}${userId}.${meetingId}`
}

const str = (value: unknown) => (typeof value === 'string' ? value : '')

/** Relit un brouillon de façon défensive ; null s'il est absent ou illisible. */
export function readDraft(userId: string, meetingId: string): FeedbackValues | null {
  let stored: unknown
  try {
    stored = JSON.parse(sessionStorage.getItem(keyOf(userId, meetingId)) ?? 'null')
  } catch {
    return null
  }
  const record = asRecord(stored)
  const stories = record && asRecord(record.stories)
  if (record === null || stories === null) return null
  const rating = typeof record.rating === 'number' && Number.isInteger(record.rating) && record.rating >= 1 && record.rating <= 5 ? record.rating : null
  return {
    rating,
    present: str(record.present),
    girls: str(record.girls),
    boys: str(record.boys),
    age: str(record.age),
    duration: str(record.duration),
    pupils: textList(record, 'pupils'),
    emotions: textList(record, 'emotions'),
    stories: { moment: str(stories.moment), exchange: str(stories.exchange), takeaway: str(stories.takeaway) },
    rawText: typeof record.rawText === 'string' ? record.rawText : null,
  }
}

export function saveDraft(userId: string, meetingId: string, values: FeedbackValues): void {
  try {
    sessionStorage.setItem(keyOf(userId, meetingId), JSON.stringify(values))
  } catch {
    // Stockage plein ou refusé : le brouillon n'est simplement pas gardé.
  }
}

export function clearDraft(userId: string, meetingId: string): void {
  sessionStorage.removeItem(keyOf(userId, meetingId))
}

/** Déconnexion : tous les brouillons de l'onglet sont effacés. */
export function clearAllDrafts(): void {
  const keys = Array.from({ length: sessionStorage.length }, (_, index) => sessionStorage.key(index)).filter(
    (key): key is string => key !== null && key.startsWith(PREFIX),
  )
  for (const key of keys) sessionStorage.removeItem(key)
}
