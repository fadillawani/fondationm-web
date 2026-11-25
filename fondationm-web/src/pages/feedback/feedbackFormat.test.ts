import { describe, expect, it } from 'vitest'
import { COMMENT_MAX, STORY_MAX, durationLabel, parseComment, quoteOf, serializeFeedback, type StructuredFeedback } from './feedbackFormat'
import { PUPIL_OPTIONS, SCHOOL_EMOTIONS, SPEAKER_EMOTIONS } from './feedbackText'

const SCHOOL: StructuredFeedback = {
  figures: { present: 35, classSize: 38, girls: 19, boys: 16, averageAge: 17, durationMinutes: 90 },
  pupils: [],
  emotions: ['Fierté', 'Émotion', 'Espoir'],
  stories: {
    moment: 'Toute la classe s’est tue quand le portefeuille a circulé.',
    exchange: 'Une élève a demandé si une fille pouvait reprendre l’atelier.\nLa réponse l’a fait sourire.',
    takeaway: '',
  },
}

const SPEAKER: StructuredFeedback = {
  figures: null,
  pupils: ['Curieux', 'Timides'],
  emotions: ['Fierté', 'Utilité'],
  stories: { moment: 'Un élève s’est levé pour regarder la lumière.', exchange: '', takeaway: 'Je me suis senti utile.\n\nAutrement qu’au travail.' },
}

describe('Format du commentaire : écriture', () => {
  it('écrit des blocs étiquetés lisibles, sans bloc pour un champ vide', () => {
    expect(serializeFeedback(SCHOOL)).toBe(
      [
        '[Classe] 35 présents sur 38 · 19 filles · 16 garçons · âge moyen 17 ans · durée 1 h 30',
        '[Émotions] Fierté, Émotion, Espoir',
        '[Moment marquant] Toute la classe s’est tue quand le portefeuille a circulé.',
        '[Un échange] Une élève a demandé si une fille pouvait reprendre l’atelier.\nLa réponse l’a fait sourire.',
      ].join('\n\n'),
    )
    expect(serializeFeedback(SPEAKER)).toBe(
      [
        '[Les élèves étaient] Curieux, Timides',
        '[Émotions] Fierté, Utilité',
        '[Moment marquant] Un élève s’est levé pour regarder la lumière.',
        '[Ce que j\'en retiens] Je me suis senti utile.\n\nAutrement qu’au travail.',
      ].join('\n\n'),
    )
  })

  it('écrit la durée en heures et minutes', () => {
    expect([45, 60, 90, 105, 120].map(durationLabel)).toEqual(['45 min', '1 h', '1 h 30', '1 h 45', '2 h'])
  })
})

describe('Format du commentaire : aller-retour', () => {
  it('relit exactement ce qui a été écrit (école et intervenant)', () => {
    expect(parseComment(serializeFeedback(SCHOOL))).toEqual({ kind: 'structured', ...SCHOOL, stories: { ...SCHOOL.stories } })
    expect(parseComment(serializeFeedback(SPEAKER))).toEqual({ kind: 'structured', ...SPEAKER })
  })

  it('échappe une ligne de récit qui commence par une étiquette connue, et la restitue telle quelle', () => {
    const tricky: StructuredFeedback = {
      figures: null,
      pupils: [],
      emotions: [],
      stories: {
        moment: '[Un échange] c’est le titre que j’ai donné au tableau.\n[Émotions] aussi, sur la deuxième ligne.\n  [Classe] avec des espaces devant.',
        exchange: 'Vrai échange.',
        takeaway: '[Étiquette inconnue] reste du texte.',
      },
    }
    const comment = serializeFeedback(tricky)
    expect(comment).toContain('[Moment marquant]  [Un échange] c’est le titre')
    expect(comment).toContain('\n [Émotions] aussi')
    expect(comment).toContain('\n   [Classe] avec des espaces devant.')
    expect(comment).toContain('[Ce que j\'en retiens] [Étiquette inconnue] reste du texte.')
    expect(parseComment(comment)).toEqual({ kind: 'structured', ...tricky })
  })

  it('normalise les fins de ligne et les espaces de bord sans rien perdre', () => {
    const parsed = parseComment(serializeFeedback({ ...SPEAKER, stories: { moment: '  Ligne 1\r\nLigne 2  ', exchange: '', takeaway: '' } }))
    expect(parsed).toMatchObject({ kind: 'structured', stories: { moment: 'Ligne 1\nLigne 2' } })
  })
})

describe('Format du commentaire : texte brut en repli', () => {
  it('lit en texte brut un commentaire libre ou hors format', () => {
    expect(parseComment('Une très belle rencontre, merci !')).toEqual({ kind: 'raw', text: 'Une très belle rencontre, merci !' })
    expect(parseComment('Bonjour\n[Moment marquant] texte')).toEqual({ kind: 'raw', text: 'Bonjour\n[Moment marquant] texte' })
    expect(parseComment('[Moment marquant] un\n[Moment marquant] deux').kind).toBe('raw')
    expect(parseComment('[Classe] beaucoup d’élèves').kind).toBe('raw')
    expect(parseComment('[Classe] 30 présents · 10 chiens').kind).toBe('raw')
    expect(parseComment('[Émotions] Joie\nune suite inattendue').kind).toBe('raw')
    expect(parseComment('[Autre] texte').kind).toBe('raw')
  })

  it('traite un commentaire vide ou absent comme vide', () => {
    expect(parseComment('')).toEqual({ kind: 'empty' })
    expect(parseComment('   \n ')).toEqual({ kind: 'empty' })
    expect(parseComment(null)).toEqual({ kind: 'empty' })
  })

  it('garde une émotion inconnue relue dans un commentaire', () => {
    expect(parseComment('[Émotions] Joie, Émerveillement')).toMatchObject({ kind: 'structured', emotions: ['Joie', 'Émerveillement'] })
  })

  it('cite le moment marquant, sinon un autre récit, sinon le texte brut', () => {
    expect(quoteOf(serializeFeedback(SCHOOL))).toBe('Toute la classe s’est tue quand le portefeuille a circulé.')
    expect(quoteOf('[Émotions] Joie\n\n[Un échange] Une question.')).toBe('Une question.')
    expect(quoteOf('Texte libre.')).toBe('Texte libre.')
    expect(quoteOf('[Émotions] Joie')).toBeNull()
    expect(quoteOf(null)).toBeNull()
  })
})

describe('Format du commentaire : budget de 2000 caractères', () => {
  it('ne dépasse pas 2000 caractères quand tout est rempli au maximum', () => {
    const full = 'x'.repeat(STORY_MAX)
    const school = serializeFeedback({
      figures: { present: 9999, classSize: 9999, girls: 9999, boys: 9999, averageAge: 30, durationMinutes: 225 },
      pupils: [],
      emotions: [...SCHOOL_EMOTIONS],
      stories: { moment: full, exchange: full, takeaway: full },
    })
    const speaker = serializeFeedback({ figures: null, pupils: [...PUPIL_OPTIONS], emotions: [...SPEAKER_EMOTIONS], stories: { moment: full, exchange: full, takeaway: full } })
    expect(school.length).toBeLessThanOrEqual(COMMENT_MAX)
    expect(speaker.length).toBeLessThanOrEqual(COMMENT_MAX)
  })
})
