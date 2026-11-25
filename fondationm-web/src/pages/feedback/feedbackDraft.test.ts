import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { endSession } from '../../auth/hooks'
import { clearDraft, readDraft, saveDraft } from './feedbackDraft'
import { initialValues } from './feedbackForm'

describe('Brouillon « Finir plus tard »', () => {
  it('garde le brouillon par compte et par rencontre, dans sessionStorage', () => {
    const values = { ...initialValues(null, 60), present: '25', rating: 4 }
    saveDraft('compte-a', 'rencontre-1', values)
    expect(readDraft('compte-a', 'rencontre-1')).toEqual(values)
    expect(readDraft('compte-b', 'rencontre-1')).toBeNull()
    expect(localStorage.length).toBe(0)
    clearDraft('compte-a', 'rencontre-1')
    expect(readDraft('compte-a', 'rencontre-1')).toBeNull()
  })

  it('ignore un brouillon illisible et relit les valeurs de façon défensive', () => {
    sessionStorage.setItem('fondationm.retour.compte-a.r2', '{pas du json')
    expect(readDraft('compte-a', 'r2')).toBeNull()
    sessionStorage.setItem('fondationm.retour.compte-a.r3', JSON.stringify({ rating: 9, present: 12, stories: { moment: 'Oui' }, emotions: ['Joie', 3] }))
    expect(readDraft('compte-a', 'r3')).toMatchObject({ rating: null, present: '', emotions: ['Joie'], stories: { moment: 'Oui', exchange: '' }, rawText: null })
  })

  it('efface tous les brouillons à la fin de session, et seulement eux', () => {
    saveDraft('compte-a', 'r1', initialValues(null, null))
    saveDraft('compte-a', 'r2', initialValues(null, null))
    sessionStorage.setItem('autre.cle', 'garde')
    endSession(new QueryClient())
    expect(readDraft('compte-a', 'r1')).toBeNull()
    expect(readDraft('compte-a', 'r2')).toBeNull()
    expect(sessionStorage.getItem('autre.cle')).toBe('garde')
  })
})
