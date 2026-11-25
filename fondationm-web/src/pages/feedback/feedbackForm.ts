import {
  COMMENT_MAX,
  EMPTY_STORIES,
  STORY_MAX,
  normalizeText,
  parseComment,
  serializeFeedback,
  type ClassFigures,
  type FeedbackStories,
} from './feedbackFormat'
import type { FeedbackRole } from './feedbackText'

/** Valeurs du formulaire ; les nombres restent du texte saisi ('' = vide). */
export interface FeedbackValues {
  /** Intervenant seulement (1 à 5). */
  rating: number | null
  present: string
  girls: string
  boys: string
  age: string
  /** Minutes, '' = non précisée. */
  duration: string
  pupils: string[]
  emotions: string[]
  stories: FeedbackStories
  /** Non null : commentaire existant hors format, édité d'un seul tenant (décision 87). */
  rawText: string | null
}

export type FeedbackField = 'rating' | 'present' | 'girls' | 'boys' | 'age' | 'stories' | 'total' | 'rawText'

export const DURATION_OPTIONS: readonly number[] = Array.from({ length: 16 }, (_, index) => (index + 1) * 15)
/** « 2 000 » avec une espace insécable (U+00A0), stable quel que soit le moteur Intl. */
const COMMENT_LABEL = `${Math.floor(COMMENT_MAX / 1000)} ${String(COMMENT_MAX % 1000).padStart(3, '0')}`
export const AGE_MIN = 8
export const AGE_MAX = 30

/** Durée du créneau arrondie au quart d'heure, entre 15 min et 4 h ; '' si inconnue. */
export function defaultDuration(slotMinutes: number | null): string {
  if (slotMinutes === null || slotMinutes <= 0) return ''
  const rounded = Math.round(slotMinutes / 15) * 15
  return String(Math.min(240, Math.max(15, rounded)))
}

const numberText = (value: number | null) => (value === null ? '' : String(value))

/** Valeurs de départ : le retour existant (relu par le parseur), sinon un formulaire vide. */
export function initialValues(existing: { comment: string | null; rating: number | null } | null, slotMinutes: number | null): FeedbackValues {
  const values: FeedbackValues = {
    rating: existing?.rating ?? null,
    present: '',
    girls: '',
    boys: '',
    age: '',
    duration: defaultDuration(slotMinutes),
    pupils: [],
    emotions: [],
    stories: { ...EMPTY_STORIES },
    rawText: null,
  }
  const parsed = parseComment(existing?.comment ?? null)
  if (parsed.kind === 'raw') return { ...values, rawText: parsed.text }
  if (parsed.kind === 'empty') return values
  const figures = parsed.figures
  return {
    ...values,
    present: numberText(figures?.present ?? null),
    girls: numberText(figures?.girls ?? null),
    boys: numberText(figures?.boys ?? null),
    age: numberText(figures?.averageAge ?? null),
    duration: figures === null ? values.duration : numberText(figures.durationMinutes),
    pupils: parsed.pupils,
    emotions: parsed.emotions,
    stories: parsed.stories,
  }
}

function count(value: string): number | null | 'invalid' {
  const trimmed = value.trim()
  if (trimmed === '') return null
  return /^\d{1,4}$/.test(trimmed) ? Number(trimmed) : 'invalid'
}

export interface FeedbackCheck {
  errors: Partial<Record<FeedbackField, string>>
  /** Commentaire tel qu'il sera envoyé. */
  comment: string
  rating: number | null
}

/** Ligne de synthèse de la classe (maquette W1-E6), calculée côté client ; null tant que « Présents » est vide. */
export function classSummary(values: FeedbackValues, studentCount: number | null): string | null {
  const present = count(values.present)
  if (typeof present !== 'number') return null
  const girls = count(values.girls)
  const boys = count(values.boys)
  const pupils = `${present} ${present > 1 ? 'élèves' : 'élève'}`
  const total = studentCount === null ? pupils : `${pupils} sur les ${studentCount} de la classe`
  if (typeof girls === 'number' && typeof boys === 'number') {
    return `${girls} ${girls > 1 ? 'filles' : 'fille'} et ${boys} ${boys > 1 ? 'garçons' : 'garçon'}, soit ${total}.`
  }
  return `${total.charAt(0).toUpperCase()}${total.slice(1)}.`
}

/**
 * Règles du formulaire (décisions 88 à 90) : école = « Présents » + au moins un récit ; intervenant = note + au moins
 * un récit ; filles + garçons = présents ; présents ≤ effectif ; 500 caractères par récit, 2000 au total.
 */
export function checkFeedback(role: FeedbackRole, values: FeedbackValues, studentCount: number | null): FeedbackCheck {
  const errors: FeedbackCheck['errors'] = {}
  const rating = role === 'speaker' ? values.rating : null
  if (role === 'speaker' && (rating === null || rating < 1 || rating > 5)) {
    errors.rating = 'Choisissez comment s’est passée la rencontre.'
  }

  if (values.rawText !== null) {
    const comment = normalizeText(values.rawText)
    if (comment === '') errors.rawText = 'Racontez la rencontre en quelques mots.'
    else if (comment.length > COMMENT_MAX) errors.rawText = `Votre récit dépasse ${COMMENT_LABEL} caractères : raccourcissez-le.`
    return { errors, comment, rating }
  }

  let figures: ClassFigures | null = null
  if (role === 'school') {
    const present = count(values.present)
    const girls = count(values.girls)
    const boys = count(values.boys)
    const age = count(values.age)
    const duration = count(values.duration)
    if (present === null) errors.present = 'Indiquez le nombre d’élèves présents.'
    else if (present === 'invalid' || present < 1) errors.present = 'Indiquez un nombre entier d’élèves, au moins 1.'
    else if (studentCount !== null && present > studentCount) {
      errors.present = `La classe compte ${studentCount} élèves : les présents ne peuvent pas être plus nombreux.`
    }
    if (girls === 'invalid') errors.girls = 'Indiquez un nombre entier.'
    if (boys === 'invalid') errors.boys = 'Indiquez un nombre entier.'
    if (girls === null && typeof boys === 'number') errors.girls = 'Indiquez aussi le nombre de filles.'
    if (boys === null && typeof girls === 'number') errors.boys = 'Indiquez aussi le nombre de garçons.'
    if (typeof girls === 'number' && typeof boys === 'number' && typeof present === 'number' && girls + boys !== present) {
      errors.boys = `Filles et garçons font ${girls + boys} : le total doit être égal aux ${present} présents.`
    }
    if (age === 'invalid' || (typeof age === 'number' && (age < AGE_MIN || age > AGE_MAX))) {
      errors.age = `L’âge moyen doit être compris entre ${AGE_MIN} et ${AGE_MAX} ans.`
    }
    if (typeof present === 'number') {
      figures = {
        present,
        classSize: studentCount,
        girls: typeof girls === 'number' ? girls : null,
        boys: typeof boys === 'number' ? boys : null,
        averageAge: typeof age === 'number' ? age : null,
        durationMinutes: typeof duration === 'number' && duration > 0 ? duration : null,
      }
    }
  }

  const stories = values.stories
  const filled = [stories.moment, stories.exchange, stories.takeaway].map(normalizeText)
  if (filled.every((story) => story === '')) errors.stories = 'Racontez au moins un moment : un seul récit suffit.'
  else if (filled.some((story) => story.length > STORY_MAX)) errors.stories = `Chaque récit est limité à ${STORY_MAX} caractères.`

  const comment = serializeFeedback({
    figures,
    pupils: role === 'speaker' ? values.pupils : [],
    emotions: values.emotions,
    stories,
  })
  if (comment.length > COMMENT_MAX) {
    errors.total = `Votre retour dépasse ${COMMENT_LABEL} caractères : raccourcissez un récit.`
  }
  return { errors, comment, rating }
}
