import type { FeedbackStories } from './feedbackFormat'

export type FeedbackRole = 'school' | 'speaker'

/** Étape d'un retour : aucun retour, SUBMITTED, PUBLISHED. */
export type FeedbackStep = 'À rédiger' | 'Soumis' | 'Validé'
export const FEEDBACK_STEPS: readonly FeedbackStep[] = ['À rédiger', 'Soumis', 'Validé']

/** Pastilles d'état (mêmes couleurs qu'en F5 et F7 ; contrastes 7,5 / 6,32 / 6,14). */
export const STEP_LOOK: Record<FeedbackStep, string> = {
  'À rédiger': 'bg-yellow text-ink',
  Soumis: 'bg-[#9DAA3C] text-ink',
  Validé: 'bg-green text-white',
}

export function stepOf(status: 'SUBMITTED' | 'PUBLISHED' | null): FeedbackStep {
  if (status === 'PUBLISHED') return 'Validé'
  if (status === 'SUBMITTED') return 'Soumis'
  return 'À rédiger'
}

/** Note de l'intervenant (maquette W2-E10) : 1 = Difficile … 5 = Inoubliable. */
export const RATING_LABELS = ['Difficile', 'Mitigée', 'Bien', 'Très bien', 'Inoubliable'] as const

export function ratingLabel(rating: number | null): string | null {
  return rating === null ? null : (RATING_LABELS[rating - 1] ?? null)
}

export const SCHOOL_EMOTIONS = ['Fierté', 'Joie', 'Émotion', 'Surprise', 'Espoir', 'Gratitude', 'Inspiration', 'Curiosité', 'Inquiétude'] as const
export const SPEAKER_EMOTIONS = ['Fierté', 'Joie', 'Émotion', 'Surprise', 'Espoir', 'Gratitude', 'Utilité', 'Nostalgie', 'Trac', 'Frustration'] as const
export const PUPIL_OPTIONS = ['Curieux', 'Attentifs', 'Participatifs', 'Timides', 'Surpris', 'Dissipés'] as const

/** Ligne d'aide sous les récits (vie privée, décision 92). */
export const PRIVACY_NOTE = 'Ce texte sera lu par les donateurs après validation de la Fondation. Évitez les noms et prénoms des élèves.'

export interface StoryField {
  key: keyof FeedbackStories
  label: string
  hint: string
}

export function storyFields(role: FeedbackRole): StoryField[] {
  return [
    { key: 'moment', label: 'Le moment qui vous a le plus marqué', hint: 'Un instant précis, une image qui vous reste.' },
    {
      key: 'exchange',
      label: 'Un échange qui vous a touché',
      hint: role === 'school' ? 'Une question d’élève, une réponse, une conversation après la séance…' : 'Une question, une réaction, un mot après la séance…',
    },
    role === 'school'
      ? {
          key: 'takeaway',
          label: 'Ce que cette rencontre vous a apporté, à vous',
          hint: 'Ce qu’elle a changé dans votre regard, ce que vous en retenez personnellement.',
        }
      : { key: 'takeaway', label: 'Ce que cette rencontre vous a apporté', hint: 'Comment elle vous a marqué, ce qu’elle a changé pour vous.' },
  ]
}

/** Intertitres des récits à la lecture (Fondation, « Mon impact »). */
export const STORY_HEADINGS: Record<keyof FeedbackStories, string> = {
  moment: 'Le moment marquant',
  exchange: 'Un échange qui a touché',
  takeaway: 'Ce que la rencontre a apporté',
}
