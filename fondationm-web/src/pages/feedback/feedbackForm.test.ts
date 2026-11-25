import { describe, expect, it } from 'vitest'
import { checkFeedback, classSummary, defaultDuration, initialValues, type FeedbackValues } from './feedbackForm'

function values(overrides: Partial<FeedbackValues> = {}): FeedbackValues {
  return {
    rating: null,
    present: '',
    girls: '',
    boys: '',
    age: '',
    duration: '',
    pupils: [],
    emotions: [],
    stories: { moment: '', exchange: '', takeaway: '' },
    rawText: null,
    ...overrides,
  }
}

const STORY = { moment: 'La classe s’est tue.', exchange: '', takeaway: '' }

describe('Formulaire de retour : règles', () => {
  it('école : « Présents » et au moins un récit sont obligatoires, pas de note', () => {
    expect(checkFeedback('school', values(), 30).errors).toEqual({
      present: 'Indiquez le nombre d’élèves présents.',
      stories: 'Racontez au moins un moment : un seul récit suffit.',
    })
    const ok = checkFeedback('school', values({ present: '25', duration: '60', stories: STORY, rating: 5 }), 30)
    expect(ok.errors).toEqual({})
    expect(ok.rating).toBeNull()
    expect(ok.comment).toBe('[Classe] 25 présents sur 30 · durée 1 h\n\n[Moment marquant] La classe s’est tue.')
  })

  it('école : présents ≤ effectif, filles + garçons = présents, âge entre 8 et 30 ans', () => {
    expect(checkFeedback('school', values({ present: '31', stories: STORY }), 30).errors.present).toBe(
      'La classe compte 30 élèves : les présents ne peuvent pas être plus nombreux.',
    )
    expect(checkFeedback('school', values({ present: '0', stories: STORY }), 30).errors.present).toBe('Indiquez un nombre entier d’élèves, au moins 1.')
    expect(checkFeedback('school', values({ present: '25', girls: '12', stories: STORY }), 30).errors.boys).toBe('Indiquez aussi le nombre de garçons.')
    expect(checkFeedback('school', values({ present: '25', boys: '12', stories: STORY }), 30).errors.girls).toBe('Indiquez aussi le nombre de filles.')
    expect(checkFeedback('school', values({ present: '25', girls: '12', boys: '12', stories: STORY }), 30).errors.boys).toBe(
      'Filles et garçons font 24 : le total doit être égal aux 25 présents.',
    )
    expect(checkFeedback('school', values({ present: '25', age: '7', stories: STORY }), 30).errors.age).toBe('L’âge moyen doit être compris entre 8 et 30 ans.')
    expect(checkFeedback('school', values({ present: '25', girls: '12', boys: '13', age: '17', stories: STORY }), null).errors).toEqual({})
  })

  it('intervenant : note et au moins un récit obligatoires ; les émotions sont facultatives', () => {
    expect(checkFeedback('speaker', values(), 30).errors).toEqual({
      rating: 'Choisissez comment s’est passée la rencontre.',
      stories: 'Racontez au moins un moment : un seul récit suffit.',
    })
    const ok = checkFeedback('speaker', values({ rating: 4, present: '12', pupils: ['Curieux'], stories: STORY }), 30)
    expect(ok.errors).toEqual({})
    expect(ok.rating).toBe(4)
    // Les chiffres de la classe ne concernent que l'école.
    expect(ok.comment).toBe('[Les élèves étaient] Curieux\n\n[Moment marquant] La classe s’est tue.')
  })

  it('bloque l’envoi au-delà de 2000 caractères au total, sans rien tronquer', () => {
    const long = values({ rating: 3, emotions: ['é'.repeat(600)], stories: { moment: 'a'.repeat(500), exchange: 'b'.repeat(500), takeaway: 'c'.repeat(500) } })
    const check = checkFeedback('speaker', long, null)
    expect(check.errors.total).toBe('Votre retour dépasse 2 000 caractères : raccourcissez un récit.')
    expect(check.comment.length).toBeGreaterThan(2000)
  })

  it('édite d’un seul tenant un commentaire hors format', () => {
    const raw = initialValues({ comment: 'Une très belle rencontre.', rating: 5 }, 60)
    expect(raw.rawText).toBe('Une très belle rencontre.')
    expect(raw.rating).toBe(5)
    expect(checkFeedback('speaker', { ...raw, rawText: '  ' }, null).errors.rawText).toBe('Racontez la rencontre en quelques mots.')
    expect(checkFeedback('speaker', raw, null).comment).toBe('Une très belle rencontre.')
  })

  it('reprend un retour structuré dans les champs du formulaire', () => {
    const start = initialValues({ comment: '[Classe] 25 présents sur 30 · 12 filles · 13 garçons · durée 1 h 30\n\n[Émotions] Joie', rating: null }, 60)
    expect(start).toMatchObject({ present: '25', girls: '12', boys: '13', age: '', duration: '90', emotions: ['Joie'], rawText: null })
  })
})

describe('Formulaire de retour : aides', () => {
  it('calcule la ligne de synthèse de la classe', () => {
    expect(classSummary(values({ present: '35', girls: '19', boys: '16' }), 38)).toBe('19 filles et 16 garçons, soit 35 élèves sur les 38 de la classe.')
    expect(classSummary(values({ present: '1' }), null)).toBe('1 élève.')
    expect(classSummary(values(), 38)).toBeNull()
  })

  it('propose la durée du créneau, arrondie au quart d’heure', () => {
    expect([60, 90, 100, 5, 400].map(defaultDuration)).toEqual(['60', '90', '105', '15', '240'])
    expect(defaultDuration(null)).toBe('')
  })
})
