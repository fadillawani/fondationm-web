import { describe, expect, it } from 'vitest'
import { STUDENT_EMAIL_DOMAIN, studentIdentifier, toStudentLoginEmail } from './studentLogin'

describe('toStudentLoginEmail', () => {
  it('complète un identifiant sans « @ » avec le domaine des élèves', () => {
    expect(toStudentLoginEmail('khadija.ba.sor')).toBe('khadija.ba.sor@eleve.fondationm.sn')
    expect(STUDENT_EMAIL_DOMAIN).toBe('eleve.fondationm.sn')
  })

  it('retire les espaces autour de l’identifiant', () => {
    expect(toStudentLoginEmail('  khadija.ba.sor ')).toBe('khadija.ba.sor@eleve.fondationm.sn')
  })

  it('envoie telle quelle une saisie qui contient « @ »', () => {
    expect(toStudentLoginEmail('eleve@exemple.sn')).toBe('eleve@exemple.sn')
  })

  it('retrouve l’identifiant lisible d’une adresse générée', () => {
    expect(studentIdentifier('khadija.ba.sor@eleve.fondationm.sn')).toBe('khadija.ba.sor')
  })
})
